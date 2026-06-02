/**
 * Lightweight Markdown renderer for chat assistant text. Supports the subset
 * the AI emits: headings, bullet / numbered lists, paragraphs, and inline
 * **bold**, *italic*, `code`, and [links](url). No external dependency.
 */

import React from 'react';
import { View, StyleSheet, Linking, TextStyle } from 'react-native';
import { Text } from '../common';
import { useAppTheme } from '../../contexts/ThemeContext';
import { ms, spacing, fontSizes } from '../../utils/responsive';

interface Props {
  content: string;
  color?: 'primary' | 'secondary' | 'white';
}

type InlineToken =
  | { t: 'text'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }
  | { t: 'code'; v: string }
  | { t: 'link'; v: string; href: string };

function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex =
    /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))|(\*([^*]+)\*)|(_([^_]+)_)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    if (m.index > lastIndex) {
      tokens.push({ t: 'text', v: input.slice(lastIndex, m.index) });
    }
    if (m[2] != null) tokens.push({ t: 'bold', v: m[2] });
    else if (m[4] != null) tokens.push({ t: 'code', v: m[4] });
    else if (m[6] != null) tokens.push({ t: 'link', v: m[6], href: m[7] });
    else if (m[9] != null) tokens.push({ t: 'italic', v: m[9] });
    else if (m[11] != null) tokens.push({ t: 'italic', v: m[11] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < input.length) {
    tokens.push({ t: 'text', v: input.slice(lastIndex) });
  }
  return tokens;
}

export const MarkdownText: React.FC<Props> = ({ content, color = 'primary' }) => {
  const theme = useAppTheme();

  const codeStyle: TextStyle = {
    fontFamily: theme.isDark ? 'monospace' : 'Courier',
    backgroundColor: theme.isDark
      ? 'rgba(255,255,255,0.10)'
      : 'rgba(0,0,0,0.06)',
    color: theme.colors.text,
    borderRadius: ms(4),
    fontSize: fontSizes.sm,
  };

  const renderInline = (text: string, keyBase: string) =>
    parseInline(text).map((tok, i) => {
      const key = `${keyBase}-${i}`;
      if (tok.t === 'bold') {
        return (
          <Text key={key} color={color} style={styles.bold}>
            {tok.v}
          </Text>
        );
      }
      if (tok.t === 'italic') {
        return (
          <Text key={key} color={color} style={styles.italic}>
            {tok.v}
          </Text>
        );
      }
      if (tok.t === 'code') {
        return (
          <Text key={key} style={codeStyle}>
            {` ${tok.v} `}
          </Text>
        );
      }
      if (tok.t === 'link') {
        return (
          <Text
            key={key}
            style={[styles.link, { color: theme.colors.secondary.main }]}
            onPress={() => Linking.openURL(tok.href).catch(() => {})}
          >
            {tok.v}
          </Text>
        );
      }
      return (
        <Text key={key} color={color}>
          {tok.v}
        </Text>
      );
    });

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (key: string) => {
    if (paragraph.length === 0) return;
    const joined = paragraph.join(' ');
    blocks.push(
      <Text key={key} variant="bodySmall" color={color} style={styles.paragraph}>
        {renderInline(joined, key)}
      </Text>,
    );
    paragraph = [];
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd();
    const key = `b-${idx}`;
    if (line.trim() === '') {
      flushParagraph(`p-${idx}`);
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph(`p-${idx}`);
      const level = heading[1].length;
      blocks.push(
        <Text
          key={key}
          variant={level === 1 ? 'h4' : 'body'}
          color={color}
          style={[styles.heading, level >= 2 && { fontSize: fontSizes.md }]}
        >
          {renderInline(heading[2], key)}
        </Text>,
      );
      return;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph(`p-${idx}`);
      blocks.push(
        <View key={key} style={styles.listItem}>
          <Text variant="bodySmall" color={color} style={styles.bulletDot}>
            {'•'}
          </Text>
          <Text variant="bodySmall" color={color} style={styles.listText}>
            {renderInline(bullet[1], key)}
          </Text>
        </View>,
      );
      return;
    }
    const ordered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ordered) {
      flushParagraph(`p-${idx}`);
      blocks.push(
        <View key={key} style={styles.listItem}>
          <Text variant="bodySmall" color={color} style={styles.bulletDot}>
            {ordered[1]}.
          </Text>
          <Text variant="bodySmall" color={color} style={styles.listText}>
            {renderInline(ordered[2], key)}
          </Text>
        </View>,
      );
      return;
    }
    paragraph.push(line);
  });
  flushParagraph('p-final');

  return <View>{blocks}</View>;
};

const styles = StyleSheet.create({
  paragraph: { marginBottom: spacing.xs },
  heading: { marginTop: spacing.xs, marginBottom: spacing.xs, fontWeight: '700' },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { textDecorationLine: 'underline' },
  listItem: { flexDirection: 'row', marginBottom: ms(2), paddingLeft: spacing.xs },
  bulletDot: { marginRight: spacing.xs, fontWeight: '700' },
  listText: { flex: 1 },
});

export default MarkdownText;
