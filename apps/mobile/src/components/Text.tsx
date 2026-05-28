import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

export interface TextProps extends RNTextProps {}

export function Text(props: TextProps) {
  const { style, ...rest } = props;
  
  // Flatten styles to inspect them
  const flattenedStyle = { ...(StyleSheet.flatten(style) || {}) };
  let fontFamily = 'Poppins_400Regular';
  let fontWeight = flattenedStyle.fontWeight;

  if (fontWeight) {
    if (fontWeight === 'normal') fontFamily = 'Poppins_400Regular';
    else if (fontWeight === '500') fontFamily = 'Poppins_500Medium';
    else if (fontWeight === '600' || fontWeight === 'semibold') fontFamily = 'Poppins_600SemiBold';
    else if (fontWeight === '700' || fontWeight === 'bold') fontFamily = 'Poppins_700Bold';
    else if (fontWeight === '800') fontFamily = 'Poppins_800ExtraBold';
    else if (fontWeight === '900') fontFamily = 'Poppins_900Black';
    else fontFamily = 'Poppins_400Regular';
    
    // On Android, using fontWeight with a custom font might break it, 
    // so we delete fontWeight and let the custom font family handle the weight.
    delete flattenedStyle.fontWeight;
  }

  // Se já tiver uma fontFamily definida, mantemos
  if (flattenedStyle.fontFamily) {
    fontFamily = flattenedStyle.fontFamily;
  }

  return (
    <RNText 
      {...rest} 
      style={[{ fontFamily }, flattenedStyle]} 
    />
  );
}
