---
paths:
  - "src/api/**"
  - "src/features/**"
  - "src/types/**"
---

# API layer and schemas — RTSH-OTT conventions

Scoped part of `rules/STYLE_GUIDE.md`; loads when you read or edit a file named above.

## API Layer

### Endpoint constants

Composable string constants. Parametrized routes as inline functions.

```ts
export const AUTH_ROUTES = 'api/auth';
export const CHANNELS_ROUTES = 'api/channels';

export const LOGIN_ROUTE = `${AUTH_ROUTES}/login`;
export const REGISTER_ROUTE = `${AUTH_ROUTES}/register`;
export const REFRESH_ROUTE = `${AUTH_ROUTES}/refresh`;

export const CHANNEL_BY_ID = (id: string) => `${CHANNELS_ROUTES}/${id}`;
export const STREAM_BY_ID = (id: string) => `${CHANNELS_ROUTES}/${id}/stream`;
```

### Service

Pure functions — no hooks, no store reads.

```ts
import { apiClient } from '../client';
import { CHANNELS_ROUTES, CHANNEL_BY_ID } from '../endpoints';
import type { Channel } from '@/types/domain';

export const getChannels = async (): Promise<Channel[]> => {
  const res = await apiClient.get(CHANNELS_ROUTES);
  return res.data.channels;
};

export const getChannelById = async (id: string): Promise<Channel> => {
  const res = await apiClient.get(CHANNEL_BY_ID(id));
  return res.data.channel;
};
```

### Query hook

```ts
import { useQuery } from '@tanstack/react-query';
import { getChannels } from '../services/channels';

export const useChannels = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channels'],
    queryFn: getChannels,
  });
  return { channels: data ?? [], isLoading, error, refetch };
};
```

### Mutation hook

The `mutationFn` logic is a **named async function** defined above the hook, not an inline arrow.

```ts
import { useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/useAppStore';
import { login } from '../services/auth';
import type { LoginFormType } from '@/types/auth';

async function loginFlow(data: LoginFormType) {
  const res = await login(data);
  return res;
}

export const useLogin = () => {
  const updateUserSlice = useAppStore((s) => s.updateUserSlice);
  const updateModalSlice = useAppStore((s) => s.updateModalSlice);

  return useMutation({
    mutationFn: loginFlow,
    onSuccess: ({ user, accessToken }) => {
      updateUserSlice({ user, token: accessToken, isAuthenticated: true });
    },
    onError: (error) => {
      updateModalSlice({ currentModal: 'apiError', modalData: { description: error.message } });
    },
  });
};
```

### Key points

- Query keys are always arrays: `['channels']`, `['epg', date]`, `['channel', id]`. First element is the resource name.
- Always return safe defaults from query hooks (`data ?? []`, `data ?? null`).
- Don't use `useEffect` to react to query `data`/`error`. v5 removed per-`useQuery` `onSuccess`/`onError`, so **unexpected** errors are handled once, centrally, by the `QueryCache`/`MutationCache` `onError` on the `queryClient` (`client.ts`) — they open the `apiError` modal (query → Retry/refetch, mutation → dismiss). Mutations keep `onError` for *expected* failures rendered inline.
- **Route form errors through `meta: INLINE_CLIENT_ERROR`** (exported from `client.ts`) — the hybrid model. Auth forms, change-password, and the register/reset wizards set it: the global modal is suppressed only for **client (4xx)** failures — the field-actionable ones they render inline — while **unexpected** failures (5xx, network, timeout) still fire the modal. The inline side mirrors the same boundary: `authErrorMessage` returns `undefined` for 5xx/network, so the form renders nothing and never doubles up with the modal. Keep `client.ts → isClientError` and `authErrorMessage`'s 4xx gate in lock-step. The global handler also skips 401/403/426 (owned by the interceptor: refresh-or-logout, force-update).
- A bare axios instance (`refreshClient`) handles the refresh endpoint only — prevents interceptor deadlock on 401.

## Schemas & Validation

Zod schema and inferred type co-located in the same file.

```ts
import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('auth:invalid_email'),
  password: z.string().min(8, 'auth:password_too_short'),
});

export type LoginFormType = z.infer<typeof LoginSchema>;
```

Schemas live in `types/` alongside domain types, not inside form files.

## Things worth avoiding

| Pattern | Preferred approach |
|---------|-------------------|
| `useEffect` reacting to query `data`/`error` | Global `QueryCache`/`MutationCache` `onError` (`client.ts`); forms render 4xx inline + modal on 5xx/network via `meta: INLINE_CLIENT_ERROR` |
