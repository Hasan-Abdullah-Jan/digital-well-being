import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Image, Platform, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TextField } from '@/components/Inputs';
import { Row, Section } from '@/components/Layout';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState } from '@/components/States';
import { Text } from '@/components/Text';
import { useT } from '@/i18n';
import { evidenceDirectory } from '@/services/privacy';
import { useApp } from '@/store/app';
import { useEvidence } from '@/store/evidence';
import type { EvidenceEntry } from '@/store/types';
import { confirm } from '@/utils/confirm';
import { makeId } from '@/utils/misc';
import { formatDate, formatTime } from '@/utils/time';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

async function toDataUri(uri: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return uri;
    const file = new File(uri);
    const base64 = await file.base64();
    const ext = uri.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export default function Evidence() {
  const { t } = useT();
  const entries = useEvidence((s) => s.entries);
  const add = useEvidence((s) => s.add);
  const remove = useEvidence((s) => s.remove);
  const toast = useApp((s) => s.showToast);
  const [editing, setEditing] = useState(false);
  const [where, setWhere] = useState('');
  const [what, setWhat] = useState('');
  const [who, setWho] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7, selectionLimit: 6 });
    if (result.canceled) return;
    if (Platform.OS === 'web') {
      setImages((list) => [...list, ...result.assets.map((a) => a.uri)]);
      return;
    }
    // Copy into Lumi's private folder so the log keeps working if the original is deleted.
    const dir = evidenceDirectory();
    const copied: string[] = [];
    for (const asset of result.assets) {
      try {
        const ext = asset.uri.split('.').pop()?.split('?')[0] || 'jpg';
        const target = new File(dir, `${makeId('img')}.${ext}`);
        new File(asset.uri).copySync(target);
        copied.push(target.uri);
      } catch {
        copied.push(asset.uri);
      }
    }
    setImages((list) => [...list, ...copied]);
  };

  const save = () => {
    if (!what.trim()) return;
    add({ at: Date.now(), where: where.trim(), what: what.trim(), who: who.trim() || undefined, images });
    setWhere('');
    setWhat('');
    setWho('');
    setImages([]);
    setEditing(false);
    toast(t('evidence.saved'));
  };

  const deleteEntry = async (entry: EvidenceEntry) => {
    const ok = await confirm({ title: t('evidence.deleteTitle'), message: t('evidence.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    if (Platform.OS !== 'web') {
      for (const uri of entry.images) {
        try {
          const f = new File(uri);
          if (f.exists) f.delete();
        } catch {
          // Already gone.
        }
      }
    }
    remove(entry.id);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const blocks: string[] = [];
      for (const e of entries) {
        const imgs = (await Promise.all(e.images.map(toDataUri))).filter(Boolean) as string[];
        blocks.push(`<section><h2>${escapeHtml(formatDate(e.at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${escapeHtml(formatTime(e.at))}</h2>
          ${e.where ? `<p><b>${escapeHtml(t('evidence.where'))}:</b> ${escapeHtml(e.where)}</p>` : ''}
          ${e.who ? `<p><b>${escapeHtml(t('evidence.who'))}:</b> ${escapeHtml(e.who)}</p>` : ''}
          <p>${escapeHtml(e.what).replace(/\n/g, '<br/>')}</p>
          ${imgs.map((src) => `<img src="${src}" />`).join('')}</section>`);
      }
      const html = `<html><head><meta charset="utf-8"/><style>body{font-family:sans-serif;padding:24px;color:#1D2330}h1{font-size:22px}h2{font-size:16px;margin-top:24px}section{border-top:1px solid #ddd;padding-top:8px}img{max-width:100%;margin:8px 0;border:1px solid #ccc}</style></head>
        <body><h1>${escapeHtml(t('evidence.pdfTitle'))}</h1><p>${escapeHtml(t('evidence.pdfIntro'))}</p>${blocks.join('')}</body></html>`;
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('evidence.pdfTitle') });
    } catch {
      toast(t('evidence.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen
      title={t('tools.evidence')}
      subtitle={t('evidence.subtitle')}
      testID="screen-evidence"
      footer={<Button label={t('evidence.add')} icon="add" full onPress={() => setEditing(true)} testID="evidence-add" />}
    >
      <Card tone="alt" style={{ marginBottom: 16 }}>
        <Text variant="small">{t('evidence.why')}</Text>
      </Card>
      <Section title={t('evidence.entries')} action={entries.length ? <Button label={t('evidence.export')} icon="document-outline" variant="ghost" small loading={exporting} onPress={exportPdf} /> : undefined}>
        {entries.length === 0 ? (
          <EmptyState icon="folder-open-outline" title={t('evidence.emptyTitle')} body={t('evidence.emptyBody')} />
        ) : (
          [...entries].reverse().map((e) => (
            <Card key={e.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="caption" color="textMuted">
                  {formatDate(e.at)} · {formatTime(e.at)}
                </Text>
                <Button label={t('common.delete')} variant="ghost" small onPress={() => void deleteEntry(e)} />
              </Row>
              {e.where ? <Text variant="smallStrong">{e.where}</Text> : null}
              <Text variant="body">{e.what}</Text>
              {e.who ? (
                <Text variant="small" color="textMuted">
                  {t('evidence.who')}: {e.who}
                </Text>
              ) : null}
              {e.images.length ? (
                <Row wrap style={{ marginTop: 8 }}>
                  {e.images.map((uri) => (
                    <Image key={uri} source={{ uri }} style={{ width: 72, height: 72, borderRadius: 8 }} accessibilityLabel={t('evidence.screenshot')} />
                  ))}
                </Row>
              ) : null}
            </Card>
          ))
        )}
      </Section>
      <Text variant="caption" color="textMuted">
        {t('evidence.privacy')}
      </Text>

      <Sheet visible={editing} onClose={() => setEditing(false)} title={t('evidence.add')}>
        <TextField label={t('evidence.where')} hint={t('evidence.whereHint')} value={where} onChangeText={setWhere} maxLength={80} />
        <TextField label={t('evidence.what')} hint={t('evidence.whatHint')} value={what} onChangeText={setWhat} multiline maxLength={2000} testID="evidence-what" />
        <TextField label={t('evidence.who')} hint={t('evidence.whoHint')} value={who} onChangeText={setWho} maxLength={80} />
        <Button label={t('evidence.addScreenshots')} icon="image-outline" variant="secondary" full onPress={pickImages} />
        {images.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {images.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} accessibilityLabel={t('evidence.screenshot')} />
            ))}
          </View>
        ) : null}
        <Button label={t('common.save')} full disabled={!what.trim()} onPress={save} testID="evidence-save" />
      </Sheet>
    </Screen>
  );
}
