'use client';

import { Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Display, Overline, Heading, Stat, Title } from '@/components/ui/text';
import { StandingCard } from '@/features/groups/components/standing-card';
import { MatchCard } from '@/features/matches/components/matches-list';
import type { Match, MatchPlayer, MatchTeam } from '@/types/api';

/**
 * Internal design-system reference. Not part of the product surface — it exists
 * so we can see every token and primitive in one place while rolling the style
 * across the app. Self-contained: no API, no auth.
 */
export default function StylePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[460px] px-5 py-10">
      <Overline>Design System</Overline>
      <Title className="mt-1">Arena</Title>
      <p className="mt-2 text-sm text-muted-foreground">
        Tokens e componentes base. Edite os valores em{' '}
        <code className="rounded bg-surface px-1 py-0.5 text-faint-foreground">globals.css</code>.
      </p>

      <Block label="Fonte — Plus Jakarta Sans">
        <div className="space-y-4">
          <div>
            <Overline>Figuras — peso 800</Overline>
            <div className="text-[34px] font-extrabold tabular-nums">0123456789</div>
          </div>
          <div>
            <Overline>Corpo — peso 500</Overline>
            <div className="text-[17px] font-medium">
              Grupos, partidas e ranking de beach tennis.
            </div>
          </div>
        </div>
      </Block>

      <Block label="Escala de tipo">
        <div className="space-y-4">
          <Row name="display">
            <Display>#5</Display>
          </Row>
          <Row name="stat-lg">
            <Stat size="lg">1017</Stat>
          </Row>
          <Row name="stat-md">
            <Stat>−22</Stat>
          </Row>
          <Row name="title">
            <Title>Masculino Life</Title>
          </Row>
          <Row name="heading">
            <Heading>Hoje</Heading>
          </Row>
          <Row name="action">
            <span className="text-action">Registrar partida</span>
          </Row>
          <Row name="label">
            <span className="text-label">Kenio</span>
          </Row>
          <Row name="body">
            <span className="text-body text-faint-foreground">
              Grupo de duplas às terças à noite
            </span>
          </Row>
          <Row name="meta">
            <span className="text-meta text-muted-foreground">19 jogadores</span>
          </Row>
          <Row name="overline">
            <Overline>Sua posição</Overline>
          </Row>
        </div>
      </Block>

      <Block label="Cores — texto">
        <div className="grid grid-cols-3 gap-3">
          <Swatch name="foreground" className="bg-foreground" />
          <Swatch name="muted-fg" className="bg-muted-foreground" />
          <Swatch name="faint" className="bg-faint-foreground" />
        </div>
      </Block>

      <Block label="Cores — superfícies e linhas">
        <div className="grid grid-cols-3 gap-3">
          <Swatch name="background" className="bg-background" />
          <Swatch name="surface" className="bg-surface" />
          <Swatch name="border" className="bg-border" />
          <Swatch name="border-accent" className="bg-border-accent" />
        </div>
      </Block>

      <Block label="Cores — accent e status">
        <div className="grid grid-cols-3 gap-3">
          <Swatch name="accent" className="bg-brand" />
          <Swatch name="accent-dark" className="bg-accent-dark" />
          <Swatch name="brand-muted" className="bg-brand-muted" />
          <Swatch name="success" className="bg-success" />
          <Swatch name="danger" className="bg-danger" />
        </div>
      </Block>

      <Block label="Cores — tags, avatares e anel">
        <div className="grid grid-cols-3 gap-3">
          <Swatch name="tag-warn" className="bg-tag-warn" />
          <Swatch name="tag-info" className="bg-tag-info" />
          <Swatch name="avatar-1" className="bg-avatar-1" />
          <Swatch name="avatar-2" className="bg-avatar-2" />
          <Swatch name="avatar-3" className="bg-avatar-3" />
          <Swatch name="avatar-4" className="bg-avatar-4" />
          <Swatch name="ring-from" className="bg-ring-from" />
          <Swatch name="ring-to" className="bg-ring-to" />
        </div>
      </Block>

      <Block label="Card de classificação">
        <StandingCard
          rank={5}
          progress={0.83}
          pointsToClimb={2}
          rating={1017}
          lastChange={{ delta: -22, occurredAt: new Date().toISOString() }}
          movement={{ direction: 'DOWN', positions: 3, occurredAt: new Date().toISOString() }}
        />
      </Block>

      <Block label="Card de partida">
        <MatchCard match={DEMO_MATCH} canManage={false} />
      </Block>

      <Block label="Botões">
        <div className="flex flex-wrap gap-3">
          <Button size="lg">
            <Plus />
            Registrar partida
          </Button>
          <Button variant="secondary">Convidar</Button>
          <Button variant="outline">Editar</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="destructive">Excluir</Button>
        </div>
      </Block>

      <Block label="Campos">
        <div className="space-y-3">
          <InputGroup>
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput placeholder="Buscar jogador ou partida" />
          </InputGroup>
          <Input placeholder="Nome do grupo" />
        </div>
      </Block>

      <Block label="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Padrão</Badge>
          <Badge variant="brand">±8</Badge>
          <Badge variant="success">↑3</Badge>
          <Badge variant="danger">↓3</Badge>
          <Badge variant="secondary">26 partidas</Badge>
          <Badge variant="outline">Admin</Badge>
        </div>
      </Block>

      <Block label="Abas">
        <Tabs defaultValue="ranking">
          <TabsList variant="line">
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="partidas">Partidas</TabsTrigger>
          </TabsList>
        </Tabs>
      </Block>

      <Block label="Card">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <Overline>Rating atual</Overline>
              <Stat className="mt-1">1017</Stat>
            </div>
            <Stat className="text-danger">−22</Stat>
          </CardContent>
        </Card>
      </Block>

      <Block label="Espaçamento — grade de 8 pontos">
        <div className="space-y-base">
          <SpacingRow name="tight" px="4" gapClass="gap-tight" />
          <SpacingRow name="snug" px="8" gapClass="gap-snug" />
          <SpacingRow name="base" px="12" gapClass="gap-base" />
          <SpacingRow name="comfortable" px="16" gapClass="gap-comfortable" />
          <SpacingRow name="section" px="24" gapClass="gap-section" />
          <SpacingRow name="loose" px="32" gapClass="gap-loose" />
          <SpacingRow name="page" px="48" gapClass="gap-page" />
        </div>
      </Block>
    </main>
  );
}

function SpacingRow({ name, px, gapClass }: { name: string; px: string; gapClass: string }) {
  return (
    <div className="flex items-center gap-4">
      <code className="w-28 shrink-0 text-meta text-faint-foreground">{name}</code>
      <code className="w-8 shrink-0 text-meta text-faint-foreground">{px}</code>
      <div className={`flex ${gapClass}`}>
        <span className="size-4 rounded-sm bg-brand/30" />
        <span className="size-4 rounded-sm bg-brand/30" />
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-4 border-b border-divider pb-2 text-overline uppercase text-faint-foreground">
        {label}
      </div>
      {children}
    </section>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4">
      <code className="w-20 shrink-0 text-meta text-faint-foreground">{name}</code>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const TS = '2026-06-18T20:00:00.000Z';

function demoPlayer(
  team: MatchTeam,
  position: number,
  firstName: string,
  rankBefore: number,
  rankAfter: number,
  ratingDelta: number,
): MatchPlayer {
  const id = `${team}-${position}`;
  return {
    id,
    matchId: 'demo',
    groupId: 'demo',
    groupMemberId: id,
    team,
    position,
    ratingBefore: 1000,
    ratingAfter: 1000 + ratingDelta,
    ratingDelta,
    rankBefore,
    rankAfter,
    rankDelta: rankAfter - rankBefore,
    movementDirection: rankAfter === rankBefore ? null : rankAfter < rankBefore ? 'UP' : 'DOWN',
    movementPositions: Math.abs(rankAfter - rankBefore) || null,
    ratingDeviationBefore: null,
    ratingDeviationAfter: null,
    ratingVolatilityBefore: null,
    ratingVolatilityAfter: null,
    ratingMuBefore: null,
    ratingMuAfter: null,
    ratingSigmaBefore: null,
    ratingSigmaAfter: null,
    playedAt: TS,
    createdAt: TS,
    updatedAt: TS,
    groupMember: {
      id,
      groupId: 'demo',
      userId: id,
      displayName: null,
      rating: 1000,
      ratingDeviation: null,
      ratingVolatility: null,
      ratingMu: null,
      ratingSigma: null,
      ratingAlgorithm: 'BEACH_ELO_V1',
      role: 'MEMBER',
      leftAt: null,
      createdAt: TS,
      updatedAt: TS,
      user: {
        id,
        firstName,
        lastName: '',
        nickname: null,
        email: null,
        avatarColor: null,
        createdAt: TS,
        updatedAt: TS,
      },
    },
  };
}

const DEMO_MATCH: Match = {
  id: 'demo',
  groupId: 'demo',
  gamesA: 6,
  gamesB: 0,
  winnerTeam: 'TEAM_A',
  teamAExpected: 0.3,
  teamBExpected: 0.7,
  teamAActual: 1,
  teamBActual: 0,
  teamARatingBefore: 2000,
  teamBRatingBefore: 2050,
  teamARatingAfter: 2016,
  teamBRatingAfter: 2034,
  ratingAlgorithm: 'BEACH_ELO_V1',
  playedAt: TS,
  createdAt: TS,
  updatedAt: TS,
  players: [
    demoPlayer('TEAM_A', 1, 'Kenio', 19, 19, 8),
    demoPlayer('TEAM_A', 2, 'Lucas', 18, 18, 8),
    demoPlayer('TEAM_B', 1, 'Samuel', 1, 1, -8),
    demoPlayer('TEAM_B', 2, 'Maurício', 2, 5, -8),
  ],
};

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-1.5">
      <div className={`h-12 rounded-xl border border-divider ${className}`} />
      <code className="block text-meta text-faint-foreground">{name}</code>
    </div>
  );
}
