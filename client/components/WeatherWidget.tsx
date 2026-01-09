import React from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Colors, Spacing, BorderRadius, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useI18n, Language } from "@/lib/i18n";
import { fetchWeather, getWeatherDescription, getWeatherIcon, WeatherData } from "@/lib/weather";

interface WeatherWidgetProps {
  city?: string | null;
  cityLat?: number | null;
  cityLon?: number | null;
  onSetCity?: () => void;
}

export function WeatherWidget({ city, cityLat, cityLon, onSetCity }: WeatherWidgetProps) {
  const { isDark } = useTheme();
  const { t, language } = useI18n();
  const colors = isDark ? Colors.dark : Colors.light;

  const hasLocation = city && cityLat && cityLon;

  const { data: weather, isLoading, error } = useQuery<WeatherData | null>({
    queryKey: ["weather", city, cityLat, cityLon],
    queryFn: () => {
      if (!hasLocation) return null;
      return fetchWeather(cityLat!, cityLon!, city!);
    },
    enabled: !!hasLocation,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 30 * 60 * 1000,
  });

  if (!hasLocation) {
    return (
      <Card style={styles.container}>
        <View style={styles.noCity}>
          <Feather name="cloud-off" size={24} color={colors.textSecondary} />
          <ThemedText style={[styles.noCityText, { color: colors.textSecondary }]}>
            {t.weather.noCity}
          </ThemedText>
          {onSetCity ? (
            <Pressable onPress={onSetCity} style={[styles.setCityBtn, { backgroundColor: colors.primary }]}>
              <ThemedText style={styles.setCityBtnText}>{t.weather.setCity}</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t.weather.updating}
          </ThemedText>
        </View>
      </Card>
    );
  }

  if (error || !weather) {
    return (
      <Card style={styles.container}>
        <View style={styles.noCity}>
          <Feather name="cloud-off" size={24} color={colors.textSecondary} />
          <ThemedText style={[styles.noCityText, { color: colors.textSecondary }]}>
            {t.common.error}
          </ThemedText>
        </View>
      </Card>
    );
  }

  const weatherIcon = getWeatherIcon(weather.current.weatherCode, weather.current.isDay);
  const weatherDesc = getWeatherDescription(weather.current.weatherCode, language as Language);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <ThemedText style={[styles.cityName, { color: colors.text }]}>
            {weather.location.city}
          </ThemedText>
        </View>
        <ThemedText style={[styles.weatherTitle, { color: colors.primary }]}>
          {t.weather.title}
        </ThemedText>
      </View>

      <View style={styles.currentWeather}>
        <View style={styles.tempSection}>
          <Feather
            name={weatherIcon as any}
            size={36}
            color={weatherIcon === "sun" ? "#FFB300" : weatherIcon === "cloud-rain" ? "#64B5F6" : colors.primary}
          />
          <ThemedText style={[styles.temperature, { color: colors.text }]}>
            {weather.current.temperature}°
          </ThemedText>
        </View>
        <View style={styles.descSection}>
          <ThemedText style={[styles.weatherDesc, { color: colors.text }]}>
            {weatherDesc}
          </ThemedText>
          <ThemedText style={[styles.feelsLike, { color: colors.textSecondary }]}>
            {t.weather.feelsLike} {weather.current.apparentTemperature}°
          </ThemedText>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.forecast}>
        <View style={styles.forecastDay}>
          <ThemedText style={[styles.forecastLabel, { color: colors.textSecondary }]}>
            {t.weather.today}
          </ThemedText>
          <Feather
            name={getWeatherIcon(weather.today.weatherCode, true) as any}
            size={20}
            color={colors.text}
          />
          <View style={styles.tempRange}>
            <ThemedText style={[styles.tempHigh, { color: colors.text }]}>
              {weather.today.temperatureMax}°
            </ThemedText>
            <ThemedText style={[styles.tempLow, { color: colors.textSecondary }]}>
              {weather.today.temperatureMin}°
            </ThemedText>
          </View>
          {weather.today.precipitationProbability > 0 ? (
            <View style={styles.precipRow}>
              <Feather name="droplet" size={12} color="#64B5F6" />
              <ThemedText style={[styles.precipText, { color: colors.textSecondary }]}>
                {weather.today.precipitationProbability}%
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={[styles.forecastDivider, { backgroundColor: colors.border }]} />

        <View style={styles.forecastDay}>
          <ThemedText style={[styles.forecastLabel, { color: colors.textSecondary }]}>
            {t.weather.tomorrow}
          </ThemedText>
          <Feather
            name={getWeatherIcon(weather.tomorrow.weatherCode, true) as any}
            size={20}
            color={colors.text}
          />
          <View style={styles.tempRange}>
            <ThemedText style={[styles.tempHigh, { color: colors.text }]}>
              {weather.tomorrow.temperatureMax}°
            </ThemedText>
            <ThemedText style={[styles.tempLow, { color: colors.textSecondary }]}>
              {weather.tomorrow.temperatureMin}°
            </ThemedText>
          </View>
          {weather.tomorrow.precipitationProbability > 0 ? (
            <View style={styles.precipRow}>
              <Feather name="droplet" size={12} color="#64B5F6" />
              <ThemedText style={[styles.precipText, { color: colors.textSecondary }]}>
                {weather.tomorrow.precipitationProbability}%
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  cityName: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  weatherTitle: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  currentWeather: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  tempSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  temperature: {
    fontSize: 40,
    fontWeight: "700",
    lineHeight: 48,
  },
  descSection: {
    flex: 1,
  },
  weatherDesc: {
    fontSize: Typography.body.fontSize,
    fontWeight: "500",
  },
  feelsLike: {
    fontSize: Typography.caption.fontSize,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  forecast: {
    flexDirection: "row",
    alignItems: "center",
  },
  forecastDay: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  forecastDivider: {
    width: 1,
    height: 50,
    marginHorizontal: Spacing.sm,
  },
  forecastLabel: {
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tempRange: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  tempHigh: {
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  tempLow: {
    fontSize: Typography.caption.fontSize,
  },
  precipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  precipText: {
    fontSize: Typography.small.fontSize,
  },
  noCity: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  noCityText: {
    fontSize: Typography.caption.fontSize,
  },
  setCityBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  setCityBtnText: {
    color: "#FFFFFF",
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.caption.fontSize,
  },
});
