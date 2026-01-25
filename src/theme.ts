/**
 * Mantine theme configuration
 * Maps existing CSS variables to Mantine theme
 */

import { createTheme, MantineColorsTuple } from '@mantine/core'

// Custom blue color (accent)
const blue: MantineColorsTuple = [
  '#e7f1ff',
  '#cfe0ff',
  '#9ebef9',
  '#6a9bf4',
  '#3b82f6', // primary (index 4)
  '#2563eb', // light mode accent (index 5)
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
  '#172554',
]

export const theme = createTheme({
  // Colors
  primaryColor: 'blue',
  colors: {
    blue,
  },

  // Typography
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '600',
  },

  // Spacing and radius
  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },

  // Component defaults
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    NumberInput: {
      defaultProps: {
        size: 'sm',
      },
    },
    Select: {
      defaultProps: {
        size: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        centered: true,
      },
    },
    Card: {
      defaultProps: {
        padding: 'md',
        radius: 'md',
        withBorder: true,
      },
    },
  },
})
