import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Pastel Light Theme
const pastelLightTheme = EditorView.theme({
  '&': {
    color: '#4a5568',
    backgroundColor: '#fafafa',
  },
  '.cm-content': {
    caretColor: '#6b7280',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#6b7280',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#e0e7ff',
  },
  '.cm-activeLine': {
    backgroundColor: '#f5f5f5',
  },
  '.cm-gutters': {
    backgroundColor: '#fafafa',
    color: '#9ca3af',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f5f5f5',
  },
}, { dark: false });

const pastelLightHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#e879a7' },           // Soft pink for keywords (SELECT, WHERE, gt, like)
  { tag: t.function(t.name), color: '#a78bfa' },  // Soft purple for functions
  { tag: t.propertyName, color: '#7ab8a0' },      // Soft teal for properties
  { tag: t.variableName, color: '#7eb0d5' },      // Soft blue for variables/columns
  { tag: t.string, color: '#f5a97f' },            // Soft orange for strings
  { tag: t.number, color: '#da9fb8' },            // Soft rose for numbers
  { tag: t.operator, color: '#b8a8d4' },          // Soft lavender for operators
  { tag: t.punctuation, color: '#9ca3af' },       // Gray for punctuation
  { tag: t.bracket, color: '#9ca3af' },           // Gray for brackets
  { tag: t.link, color: '#8fb9d3' },              // Soft sky blue for links
  { tag: t.atom, color: '#a8d4b0' },              // Soft mint for booleans
  { tag: t.comment, color: '#c4c4c4', fontStyle: 'italic' },
]);

// Pastel Dark Theme
const pastelDarkTheme = EditorView.theme({
  '&': {
    color: '#d4d4d8',
    backgroundColor: '#1e1e2e',
  },
  '.cm-content': {
    caretColor: '#d4d4d8',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#d4d4d8',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#3b3b54',
  },
  '.cm-activeLine': {
    backgroundColor: '#27273a',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e2e',
    color: '#6c6c8a',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#27273a',
  },
}, { dark: true });

const pastelDarkHighlight = HighlightStyle.define([
  { tag: t.keyword, color: '#f5a0c7' },           // Soft pink for keywords
  { tag: t.function(t.name), color: '#c4b5fd' },  // Soft purple for functions
  { tag: t.propertyName, color: '#94d9c3' },      // Soft teal for properties
  { tag: t.variableName, color: '#9dc4e8' },      // Soft blue for variables/columns
  { tag: t.string, color: '#ffc59f' },            // Soft orange for strings
  { tag: t.number, color: '#f0b5d1' },            // Soft rose for numbers
  { tag: t.operator, color: '#d4c5f0' },          // Soft lavender for operators
  { tag: t.punctuation, color: '#a1a1b5' },       // Muted gray for punctuation
  { tag: t.bracket, color: '#a1a1b5' },           // Muted gray for brackets
  { tag: t.link, color: '#a8d4f5' },              // Soft sky blue for links
  { tag: t.atom, color: '#bae6ca' },              // Soft mint for booleans
  { tag: t.comment, color: '#6c6c8a', fontStyle: 'italic' },
]);

export const pastelLight: Extension = [
  pastelLightTheme,
  syntaxHighlighting(pastelLightHighlight),
];

export const pastelDark: Extension = [
  pastelDarkTheme,
  syntaxHighlighting(pastelDarkHighlight),
];
