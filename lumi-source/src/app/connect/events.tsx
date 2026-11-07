import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IconCircle } from '@/components/Icon';
import { Chip, Pill, Row } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { Text } from '@/components/Text';
import { openLink } from '@/features/help';
import { useContent, useT } from '@/i18n';
import { getCommunity, useCommunityMode, type CommunityEvent } from '@/services/community';
import { useCommunityLocal } from '@/store/community';
import { formatDate, formatTime } from '@/utils/time';

export default function Events() {
  const { t } = useT();
  const content = useContent();
  const mode = useCommunityMode();
  const interested = useCommunityLocal((s) => s.interestedEvents);
  const toggle = useCommunityLocal((s) => s.toggleInterested);
  const [events, setEvents] = useState<CommunityEvent[] | null>(null);
  const [error, setError] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const load = useCallback(async () => {
    const service = getCommunity();
    if (!service) {
      setEvents([]);
      return;
    }
    setError(false);
    try {
      setEvents(await service.listEvents());
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const list = (events ?? []).filter((e) => !category || e.category === category);

  return (
    <Screen title={t('connect.events')} subtitle={t('events.subtitle')} testID="screen-events">
      {mode === 'unavailable' ? (
        <EmptyState icon="calendar-outline" title={t('events.offTitle')} body={t('events.offBody')} />
      ) : (
        <>
          <Row wrap style={{ marginBottom: 16 }}>
            <Chip label={t('events.all')} selected={!category} onPress={() => setCategory(null)} />
            {content.eventCategories.map((c) => (
              <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(category === c.id ? null : c.id)} />
            ))}
          </Row>
          {error ? (
            <ErrorState onRetry={load} />
          ) : events === null ? (
            <LoadingState />
          ) : list.length === 0 ? (
            <EmptyState icon="calendar-outline" title={t('events.emptyTitle')} body={t('events.emptyBody')} />
          ) : (
            <View style={{ gap: 12 }}>
              {list.map((e) => {
                const cat = content.eventCategories.find((c) => c.id === e.category);
                const isInterested = interested.includes(e.id);
                return (
                  <Card key={e.id}>
                    <Row style={{ alignItems: 'flex-start' }}>
                      <IconCircle name={cat?.icon ?? 'calendar-outline'} tone="accent" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong">{e.title}</Text>
                        <Text variant="small" color="textMuted">
                          {formatDate(e.startsAt, { weekday: 'long', day: 'numeric', month: 'long' })} · {formatTime(e.startsAt)}
                        </Text>
                        <Text variant="small" color="textMuted">
                          {e.location}
                        </Text>
                      </View>
                    </Row>
                    <Text variant="body" style={{ marginTop: 10 }}>
                      {e.description}
                    </Text>
                    <Row style={{ marginTop: 12 }} wrap>
                      {cat ? <Pill label={cat.label} /> : null}
                      <Button
                        label={isInterested ? t('events.interested') : t('events.markInterested')}
                        icon={isInterested ? 'star' : 'star-outline'}
                        variant={isInterested ? 'soft' : 'secondary'}
                        small
                        onPress={() => toggle(e.id)}
                      />
                      <Button
                        label={t('events.invite')}
                        icon="share-social-outline"
                        variant="ghost"
                        small
                        onPress={() =>
                          Share.share({ message: t('events.inviteMessage', { title: e.title, date: formatDate(e.startsAt), time: formatTime(e.startsAt), place: e.location }) }).catch(() => undefined)
                        }
                      />
                      {e.link ? <Button label={t('events.moreInfo')} variant="ghost" small onPress={() => openLink(e.link!)} /> : null}
                    </Row>
                  </Card>
                );
              })}
            </View>
          )}
          <Text variant="caption" color="textMuted" style={{ marginTop: 16 }}>
            {t('events.privacy')}
          </Text>
        </>
      )}
    </Screen>
  );
}
