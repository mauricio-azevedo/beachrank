'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { buildAuthPath } from '@/features/auth/auth-navigation';

export function SignedOutFeedState() {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <TypographySmall>Entre para ver seu feed</TypographySmall>
          <TypographyMuted>Acompanhe os momentos dos grupos onde você joga.</TypographyMuted>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button asChild>
            <Link href={buildAuthPath({ mode: 'login' })}>Entrar</Link>
          </Button>

          <Button asChild variant="outline">
            <Link href={buildAuthPath({ mode: 'signup' })}>Criar conta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
