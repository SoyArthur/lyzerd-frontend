'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthInterceptor() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      // Si el sistema detecta el protocolo de recuperación en el hash...
      if (hash && hash.includes('type=recovery')) {
        // ...fuerza la convergencia hacia el destino correcto.
        router.replace(`/resetpassword${hash}`);
      }
    }
  }, [router]);

  return null; // Invisible, pero vigilante.
}
