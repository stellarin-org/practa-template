import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp } from "react-native";
import { Image, ImageSource, ImageContentFit } from "expo-image";
import { useTheme } from "@/hooks/useTheme";

interface PractaImageProps {
  source: ImageSource | string | number | null | undefined;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  placeholder?: string;
  placeholderContentFit?: ImageContentFit;
  transition?: number;
  circular?: boolean;
  size?: number;
}

export function PractaImage({
  source,
  style,
  contentFit = "cover",
  placeholder,
  placeholderContentFit = "cover",
  transition = 400,
  circular = false,
  size,
}: PractaImageProps) {
  const { theme } = useTheme();

  if (!source) return null;

  const sizeStyle = size
    ? { width: size, height: size, borderRadius: circular ? size / 2 : 0 }
    : undefined;

  return (
    <View style={[sizeStyle && { overflow: "hidden", borderRadius: sizeStyle.borderRadius }, style]}>
      <Image
        source={source}
        style={[styles.image, sizeStyle]}
        contentFit={contentFit}
        placeholder={placeholder ? { blurhash: placeholder } : undefined}
        placeholderContentFit={placeholderContentFit}
        transition={transition}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: "100%",
  },
});
