import { View } from 'react-native';

import { useTheme } from '@/theme';

const SIZE = 28;

/**
 * The marker fixed at the middle of a map. A ringed dot, not a teardrop pin:
 * the place meant is the centre of the dot, with no tip to guess about.
 */
export function MapPin() {
  const theme = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: SIZE,
        height: SIZE,
        marginTop: -SIZE / 2,
        marginLeft: -SIZE / 2,
        borderRadius: SIZE / 2,
        borderWidth: 4,
        // Fixed colours: the map underneath is light in both themes.
        borderColor: '#FFFFFF',
        backgroundColor: '#1557B8',
        boxShadow: '0 2px 8px rgba(20, 32, 46, 0.45)',
      }}>
      <View
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 6,
          height: 6,
          marginTop: -3,
          marginLeft: -3,
          borderRadius: 3,
          backgroundColor: theme.colors.near,
        }}
      />
    </View>
  );
}
