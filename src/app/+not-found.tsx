import { useRouter } from 'expo-router';
import React from 'react';

import { AppBar, EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen>
      <AppBar title="Not found" />
      <EmptyState
        icon="help-circle-outline"
        title="This screen doesn't exist"
        message="The link you followed may be broken or the page may have moved."
        actionLabel="Go home"
        onAction={() => router.replace('/')}
      />
    </Screen>
  );
}
