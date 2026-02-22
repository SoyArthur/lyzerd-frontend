// ============================================
// 🦎 LYZERD - ADVANCED TELEMETRY & USER PROFILING SYSTEM
// ============================================

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || '';

// ============================================
// SESSION MANAGER
// ============================================
class SessionManager {
  constructor() {
    this.sessionKey = 'lyzerd_session';
    this.profileKey = 'lyzerd_profile';
    this.session = this.loadSession();
    this.profile = this.loadProfile();
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.idleThreshold = 5 * 60 * 1000; // 5 minutos
    this.setupListeners();
  }

  loadSession() {
    if (typeof window === 'undefined') return null;
    const s = sessionStorage.getItem(this.sessionKey);
    if (s) {
      const session = JSON.parse(s);
      // Si la sesión tiene más de 30 mins de idle, crear nueva
      if (Date.now() - session.lastActivity > 30 * 60 * 1000) {
        return this.createSession();
      }
      return session;
    }
    return this.createSession();
  }

  createSession() {
    const session = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      interactions: 0,
      tokensViewed: [],
      featuresUsed: [],
      errors: [],
      activeTime: 0, // milliseconds
      idleTime: 0,
    };
    this.saveSession(session);
    return session;
  }

  loadProfile() {
    if (typeof window === 'undefined') return null;
    const p = localStorage.getItem(this.profileKey);
    if (p) return JSON.parse(p);
    return this.createProfile();
  }

  createProfile() {
    const profile = {
      userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      totalSessions: 0,
      totalActiveTime: 0,
      totalIdleTime: 0,
      totalTokensViewed: 0,
      uniqueTokens: new Set(),
      favoriteTokens: [],
      blockchainPreference: null, // ethereum | solana
      peakHours: {}, // hour -> count
      daysActive: new Set(),
      featuresUsed: {},
      avgSessionDuration: 0,
      lastVisit: Date.now(),
      returnFrequency: 'new', // new | returning | regular | power
      engagementScore: 0,
      preferences: {
        theme: 'dark',
        language: 'es',
        notifications: false,
      },
    };
    this.saveProfile(profile);
    return profile;
  }

  setupListeners() {
    if (typeof window === 'undefined') return;

    // Track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, () => this.recordActivity(), { passive: true });
    });

    // Track idle
    this.idleInterval = setInterval(() => this.checkIdle(), 10000); // cada 10s

    // Save on unload
    window.addEventListener('beforeunload', () => this.endSession());

    // Track visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordActivity(); // save before hiding
      }
    });
  }

  recordActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    if (timeSinceLastActivity < this.idleThreshold) {
      this.session.activeTime += timeSinceLastActivity;
    } else {
      this.session.idleTime += timeSinceLastActivity;
    }

    this.lastActivity = now;
    this.session.lastActivity = now;
    this.session.interactions++;
    
    // Update peak hours
    const hour = new Date().getHours();
    this.profile.peakHours[hour] = (this.profile.peakHours[hour] || 0) + 1;

    // Update days active
    const today = new Date().toDateString();
    this.profile.daysActive.add(today);

    this.saveSession(this.session);
    this.saveProfile(this.profile);
  }

  checkIdle() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivity;
    
    if (timeSinceLastActivity > this.idleThreshold) {
      this.session.idleTime += 10000; // 10s idle
      this.saveSession(this.session);
    }
  }

  trackPageView(url) {
    this.session.pageViews++;
    this.recordActivity();
  }

  trackTokenView(address, symbol, blockchain) {
    if (!this.session.tokensViewed.includes(address)) {
      this.session.tokensViewed.push(address);
    }
    
    this.profile.totalTokensViewed++;
    this.profile.uniqueTokens.add(address);
    
    // Track blockchain preference
    if (!this.profile.blockchainPreference) {
      this.profile.blockchainPreference = blockchain;
    } else {
      // Simple preference update (could be more sophisticated)
      const bcCount = this.session.tokensViewed.filter(t => 
        this.profile.uniqueTokens.has(t)
      ).length;
      if (bcCount > 5 && blockchain !== this.profile.blockchainPreference) {
        this.profile.blockchainPreference = blockchain;
      }
    }

    this.recordActivity();
  }

  trackFeature(featureName) {
    if (!this.session.featuresUsed.includes(featureName)) {
      this.session.featuresUsed.push(featureName);
    }
    
    this.profile.featuresUsed[featureName] = (this.profile.featuresUsed[featureName] || 0) + 1;
    this.recordActivity();
  }

  trackError(error) {
    this.session.errors.push({
      message: error.message || 'Unknown',
      timestamp: Date.now(),
    });
    this.saveSession(this.session);
  }

  endSession() {
    const now = Date.now();
    const sessionDuration = now - this.session.startTime;
    
    // Update profile stats
    this.profile.totalSessions++;
    this.profile.totalActiveTime += this.session.activeTime;
    this.profile.totalIdleTime += this.session.idleTime;
    this.profile.avgSessionDuration = 
      (this.profile.avgSessionDuration * (this.profile.totalSessions - 1) + sessionDuration) 
      / this.profile.totalSessions;
    
    this.profile.lastVisit = now;
    
    // Calculate return frequency
    const daysSinceCreation = (now - this.profile.createdAt) / (1000 * 60 * 60 * 24);
    const sessionsPerDay = this.profile.totalSessions / Math.max(daysSinceCreation, 1);
    
    if (sessionsPerDay >= 3) this.profile.returnFrequency = 'power';
    else if (sessionsPerDay >= 1) this.profile.returnFrequency = 'regular';
    else if (this.profile.totalSessions > 3) this.profile.returnFrequency = 'returning';
    else this.profile.returnFrequency = 'new';

    // Calculate engagement score (0-100)
    const engagementFactors = {
      sessions: Math.min(this.profile.totalSessions / 20, 1) * 20,
      activeTime: Math.min(this.profile.totalActiveTime / (1000 * 60 * 60), 1) * 20, // 1hr = max
      tokensViewed: Math.min(this.profile.totalTokensViewed / 50, 1) * 20,
      featuresUsed: Math.min(Object.keys(this.profile.featuresUsed).length / 10, 1) * 20,
      returnFrequency: { power: 20, regular: 15, returning: 10, new: 5 }[this.profile.returnFrequency],
    };
    
    this.profile.engagementScore = Math.round(
      Object.values(engagementFactors).reduce((a, b) => a + b, 0)
    );

    this.saveProfile(this.profile);
    
    // Send session summary to GA4
    if (window.gtag && GA4_ID) {
      window.gtag('event', 'session_end', {
        session_id: this.session.id,
        session_duration: Math.round(sessionDuration / 1000), // seconds
        active_time: Math.round(this.session.activeTime / 1000),
        idle_time: Math.round(this.session.idleTime / 1000),
        page_views: this.session.pageViews,
        interactions: this.session.interactions,
        tokens_viewed: this.session.tokensViewed.length,
        features_used: this.session.featuresUsed.length,
        errors: this.session.errors.length,
        engagement_score: this.profile.engagementScore,
        return_frequency: this.profile.returnFrequency,
      });
    }

    // Clear session
    sessionStorage.removeItem(this.sessionKey);
  }

  saveSession(session) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  saveProfile(profile) {
    if (typeof window === 'undefined') return;
    // Convert Sets to Arrays for JSON
    const serializable = {
      ...profile,
      uniqueTokens: Array.from(profile.uniqueTokens),
      daysActive: Array.from(profile.daysActive),
    };
    localStorage.setItem(this.profileKey, JSON.stringify(serializable));
  }

  getProfile() {
    return {
      ...this.profile,
      uniqueTokens: Array.from(this.profile.uniqueTokens),
      daysActive: Array.from(this.profile.daysActive),
    };
  }

  getSession() {
    return this.session;
  }

  getStats() {
    const now = Date.now();
    const sessionDuration = now - this.session.startTime;
    
    return {
      session: {
        id: this.session.id,
        duration: sessionDuration,
        activeTime: this.session.activeTime,
        idleTime: this.session.idleTime,
        pageViews: this.session.pageViews,
        interactions: this.session.interactions,
        tokensViewed: this.session.tokensViewed.length,
        featuresUsed: this.session.featuresUsed,
        errors: this.session.errors.length,
      },
      profile: {
        userId: this.profile.userId,
        totalSessions: this.profile.totalSessions,
        totalActiveTime: this.profile.totalActiveTime,
        totalIdleTime: this.profile.totalIdleTime,
        totalTokensViewed: this.profile.totalTokensViewed,
        uniqueTokens: this.profile.uniqueTokens.size,
        blockchainPreference: this.profile.blockchainPreference,
        peakHours: this.getPeakHours(),
        daysActive: this.profile.daysActive.size,
        topFeatures: this.getTopFeatures(),
        avgSessionDuration: this.profile.avgSessionDuration,
        returnFrequency: this.profile.returnFrequency,
        engagementScore: this.profile.engagementScore,
      }
    };
  }

  getPeakHours() {
    const hours = Object.entries(this.profile.peakHours)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    return hours;
  }

  getTopFeatures() {
    const features = Object.entries(this.profile.featuresUsed)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    return features;
  }

  clear() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(this.sessionKey);
    localStorage.removeItem(this.profileKey);
    this.session = this.createSession();
    this.profile = this.createProfile();
  }
}

const sessionManager = new SessionManager();

// ============================================
// INIT GA4
// ============================================
export function initGA4() {
  if (typeof window === 'undefined' || !GA4_ID) return;
  
  window.dataLayer = window.dataLayer || [];
  
  function gtag(...args) {
    window.dataLayer.push(args);
  }
  
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA4_ID, { 
    send_page_view: false,
    user_id: sessionManager.profile.userId,
  });
  
  // Set custom dimensions
  gtag('set', 'user_properties', {
    engagement_score: sessionManager.profile.engagementScore,
    return_frequency: sessionManager.profile.returnFrequency,
    blockchain_preference: sessionManager.profile.blockchainPreference,
  });
  
  console.log('[Telemetry] GA4 initialized:', GA4_ID);
}

// ============================================
// TRACKING FUNCTIONS
// ============================================
const track = (event, data = {}) => {
  if (typeof window === 'undefined' || !GA4_ID || !window.gtag) return;
  
  // Add session context to all events
  const enrichedData = {
    ...data,
    session_id: sessionManager.session.id,
    user_id: sessionManager.profile.userId,
    engagement_score: sessionManager.profile.engagementScore,
    return_frequency: sessionManager.profile.returnFrequency,
  };
  
  window.gtag('event', event, enrichedData);
};

// ============================================
// PAGE & NAVIGATION
// ============================================
export const trackPageView = (url, title = '') => {
  sessionManager.trackPageView(url);
  
  track('page_view', {
    page_path: url,
    page_title: title || document.title,
    page_location: window.location.href,
    page_views_in_session: sessionManager.session.pageViews,
  });
};

export const trackNavigation = (from, to) => {
  track('navigation', {
    from_page: from,
    to_page: to,
    navigation_type: 'internal',
  });
};

// ============================================
// TOKEN INTERACTIONS
// ============================================
export const trackTokenAnalysis = (data) => {
  sessionManager.trackTokenView(data.address, data.symbol, data.blockchain);
  
  track('token_analysis', {
    token_address: data.address,
    token_symbol: data.symbol,
    blockchain: data.blockchain,
    safety_score: data.safetyScore,
    momentum_score: data.momentumScore,
    was_cached: data.cached || false,
    from_buffer: data.fromBuffer || false,
    has_whales: data.whales?.length > 0,
    holder_count: data.holders || 0,
    price: data.price || 0,
  });
  
  console.log('[Telemetry] Token analysis:', data.symbol);
};

export const trackDeepAnalysis = (data) => {
  sessionManager.trackFeature('deep_analysis');
  
  track('deep_analysis', {
    token_address: data.address,
    token_symbol: data.symbol,
    rsi: data.rsi,
    has_historical: !!data.historicalData,
    has_ai: !!data.aiAnalysis,
    analysis_depth: data.analysisDepth || 'standard',
  });
  
  console.log('[Telemetry] Deep analysis:', data.symbol);
};

export const trackTokenFavorite = (symbol, action) => {
  track('token_favorite', {
    token_symbol: symbol,
    action, // 'add' | 'remove'
  });
};

export const trackTokenCompare = (symbols) => {
  sessionManager.trackFeature('token_compare');
  
  track('token_compare', {
    token_count: symbols.length,
    tokens: symbols.join(','),
  });
};

export const trackTokenShare = (method, symbol, blockchain) => {
  track('share', {
    method, // 'twitter' | 'telegram' | 'copy' | 'native'
    content_type: 'token_analysis',
    item_id: symbol,
    blockchain,
  });
  
  console.log('[Telemetry] Share:', method, symbol);
};

// ============================================
// CHAT & AI
// ============================================
export const trackChatMessage = (data) => {
  sessionManager.trackFeature('chat');
  
  track('chat_message', {
    token_symbol: data.tokenSymbol,
    message_length: data.messageLength,
    has_context: !!data.hasContext,
    chat_turn: data.turnNumber || 1,
  });
};

export const trackChatSession = (data) => {
  track('chat_session', {
    token_symbol: data.tokenSymbol,
    total_messages: data.totalMessages,
    session_duration: data.duration,
    avg_response_time: data.avgResponseTime,
  });
};

export const trackAIFeedback = (rating, helpful, tokenSymbol) => {
  sessionManager.trackFeature('ai_feedback');
  
  track('ai_feedback', {
    rating, // 1-5
    helpful, // true | false | null
    token_symbol: tokenSymbol,
  });
};

// ============================================
// FEATURES & INTERACTIONS
// ============================================
export const trackFeature = (featureName, data = {}) => {
  sessionManager.trackFeature(featureName);
  
  track('feature_usage', { 
    feature_name: featureName, 
    ...data 
  });
  
  console.log('[Telemetry] Feature:', featureName);
};

export const trackButtonClick = (buttonName, context = '') => {
  track('button_click', {
    button_name: buttonName,
    context,
  });
};

export const trackScrollDepth = (percentage, page) => {
  track('scroll', {
    percent_scrolled: percentage,
    page_path: page,
  });
};

export const trackTimeOnPage = (page, seconds) => {
  track('timing_complete', {
    name: 'time_on_page',
    value: seconds * 1000, // milliseconds
    page_path: page,
  });
};

export const trackModalView = (modalName) => {
  sessionManager.trackFeature(`modal_${modalName}`);
  
  track('modal_view', {
    modal_name: modalName,
  });
};

export const trackDropdownOpen = (dropdownName) => {
  track('dropdown_open', {
    dropdown_name: dropdownName,
  });
};

export const trackSearch = (query, resultsCount) => {
  sessionManager.trackFeature('search');
  
  track('search', {
    search_term: query,
    results_count: resultsCount,
  });
};

export const trackFilter = (filterType, filterValue) => {
  track('filter_applied', {
    filter_type: filterType,
    filter_value: filterValue,
  });
};

export const trackSort = (sortBy, sortOrder) => {
  track('sort_applied', {
    sort_by: sortBy,
    sort_order: sortOrder,
  });
};

// ============================================
// USER ACTIONS
// ============================================
export const trackCopy = (type, value) => {
  track('copy', {
    copy_type: type,
    value_preview: value?.substring(0, 10),
  });
};

export const trackDownload = (fileType, fileName) => {
  sessionManager.trackFeature('download');
  
  track('download', {
    file_type: fileType,
    file_name: fileName,
  });
};

export const trackExport = (exportType, format) => {
  sessionManager.trackFeature('export');
  
  track('export', {
    export_type: exportType,
    format, // 'json' | 'csv' | 'pdf'
  });
};

export const trackPrint = (contentType) => {
  track('print', {
    content_type: contentType,
  });
};

// ============================================
// SETTINGS & PREFERENCES
// ============================================
export const trackLanguageChange = (from, to) => {
  sessionManager.profile.preferences.language = to;
  sessionManager.saveProfile(sessionManager.profile);
  
  track('language_change', { 
    from_language: from, 
    to_language: to 
  });
  
  console.log('[Telemetry] Language:', from, '→', to);
};

export const trackThemeChange = (from, to) => {
  sessionManager.profile.preferences.theme = to;
  sessionManager.saveProfile(sessionManager.profile);
  
  track('theme_change', {
    from_theme: from,
    to_theme: to,
  });
};

export const trackNotificationToggle = (enabled) => {
  sessionManager.profile.preferences.notifications = enabled;
  sessionManager.saveProfile(sessionManager.profile);
  
  track('notification_toggle', {
    enabled,
  });
};

export const trackSettingsChange = (setting, value) => {
  track('settings_change', {
    setting_name: setting,
    setting_value: value,
  });
};

// ============================================
// ERRORS & PERFORMANCE
// ============================================
export const trackError = (error) => {
  sessionManager.trackError(error);
  
  track('error', {
    error_message: error.message || 'Unknown error',
    error_type: error.type || 'general',
    error_code: error.code || null,
    page_path: window.location.pathname,
    stack_trace: error.stack?.substring(0, 500) || null,
  });
  
  console.error('[Telemetry] Error:', error);
};

export const trackAPIError = (endpoint, statusCode, message) => {
  track('api_error', {
    endpoint,
    status_code: statusCode,
    error_message: message,
  });
};

export const trackPerformance = (metric, value) => {
  track('timing_complete', {
    name: metric,
    value: Math.round(value),
    event_category: 'performance',
  });
};

export const trackPageLoadTime = (loadTime) => {
  track('timing_complete', {
    name: 'page_load',
    value: Math.round(loadTime),
    event_category: 'performance',
  });
};

export const trackAPILatency = (endpoint, latency) => {
  track('timing_complete', {
    name: 'api_latency',
    value: Math.round(latency),
    event_category: 'performance',
    event_label: endpoint,
  });
};

// ============================================
// ENGAGEMENT & RETENTION
// ============================================
export const trackEngagement = (action, value = null) => {
  track('engagement', {
    engagement_type: action,
    engagement_value: value,
    engagement_score: sessionManager.profile.engagementScore,
  });
};

export const trackReturnVisit = () => {
  const daysSinceLastVisit = (Date.now() - sessionManager.profile.lastVisit) / (1000 * 60 * 60 * 24);
  
  track('return_visit', {
    days_since_last_visit: Math.round(daysSinceLastVisit),
    total_sessions: sessionManager.profile.totalSessions,
    return_frequency: sessionManager.profile.returnFrequency,
  });
};

export const trackAchievement = (achievementName) => {
  track('achievement', {
    achievement_name: achievementName,
  });
};

// ============================================
// GLOSSARY & EDUCATION
// ============================================
export const trackGlossaryView = (term, language) => {
  sessionManager.trackFeature('glossary');
  
  track('glossary_view', { 
    term, 
    language 
  });
};

export const trackTooltipView = (tooltipName) => {
  track('tooltip_view', {
    tooltip_name: tooltipName,
  });
};

export const trackTutorialStart = (tutorialName) => {
  track('tutorial_start', {
    tutorial_name: tutorialName,
  });
};

export const trackTutorialComplete = (tutorialName, duration) => {
  track('tutorial_complete', {
    tutorial_name: tutorialName,
    duration,
  });
};

// ============================================
// CONSENT MANAGER
// ============================================
export class ConsentManager {
  constructor() {
    this.key = 'lyzerd_consent';
    this.consent = this.load();
  }
  
  load() {
    if (typeof window === 'undefined') return null;
    const s = localStorage.getItem(this.key);
    return s ? JSON.parse(s) : null;
  }
  
  save(c) {
    if (typeof window === 'undefined') return;
    this.consent = {
      analytics: c.analytics,
      marketing: c.marketing,
      essential: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(this.key, JSON.stringify(this.consent));
    
    if (c.analytics) {
      initGA4();
      trackEngagement('consent_granted', 'analytics');
    }
  }
  
  has(type = 'analytics') {
    return this.consent?.[type] === true;
  }
  
  needs() {
    return this.consent === null;
  }
  
  revoke() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.key);
    this.consent = null;
    if (window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
      });
    }
    trackEngagement('consent_revoked');
  }
}

export const consentManager = new ConsentManager();

// ============================================
// INIT & EXPORT
// ============================================
export function initTelemetry() {
  if (consentManager.has('analytics')) {
    initGA4();
    trackReturnVisit();
  }
  console.log('[Telemetry] Ready | User:', sessionManager.profile.userId);
}

// Export session manager for debugging
export const getSessionStats = () => sessionManager.getStats();
export const getUserProfile = () => sessionManager.getProfile();
export const clearUserData = () => sessionManager.clear();

// Auto-save session periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    sessionManager.saveSession(sessionManager.session);
    sessionManager.saveProfile(sessionManager.profile);
  }, 30000); // cada 30s
}
