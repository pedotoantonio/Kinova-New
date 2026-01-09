import React, { useState, useCallback } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing, BorderRadius } from "../constants/theme";
import { useI18n } from "../lib/i18n";
import { queryKeys, apiRequest } from "../lib/query-client";
import { openMapsNavigation } from "../lib/maps";

export type PlaceCategory = "home" | "work" | "school" | "leisure" | "other";

export interface Place {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  category: PlaceCategory;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PlacePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (place: Place) => void;
  selectedPlaceId?: string | null;
}

const CATEGORY_ICONS: Record<PlaceCategory, keyof typeof Feather.glyphMap> = {
  home: "home",
  work: "briefcase",
  school: "book",
  leisure: "coffee",
  other: "map-pin",
};

export function PlacePickerModal({
  visible,
  onClose,
  onSelect,
  selectedPlaceId,
}: PlacePickerModalProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceAddress, setNewPlaceAddress] = useState("");
  const [newPlaceLatitude, setNewPlaceLatitude] = useState("");
  const [newPlaceLongitude, setNewPlaceLongitude] = useState("");
  const [newPlaceCategory, setNewPlaceCategory] = useState<PlaceCategory>("other");
  const [error, setError] = useState<string | null>(null);

  const { data: places = [], isLoading } = useQuery<Place[]>({
    queryKey: queryKeys.places.all,
  });

  const createPlaceMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      address?: string;
      latitude: number;
      longitude: number;
      category: PlaceCategory;
    }) => {
      return apiRequest<Place>("POST", "/api/places", data);
    },
    onSuccess: (newPlace) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.places.all });
      onSelect(newPlace);
      resetCreateForm();
      onClose();
    },
    onError: () => {
      setError(t.common.error);
    },
  });

  const resetCreateForm = useCallback(() => {
    setShowCreateForm(false);
    setNewPlaceName("");
    setNewPlaceAddress("");
    setNewPlaceLatitude("");
    setNewPlaceLongitude("");
    setNewPlaceCategory("other");
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetCreateForm();
    setSearchQuery("");
    onClose();
  }, [onClose, resetCreateForm]);

  const filteredPlaces = places.filter((place) =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlace = useCallback(() => {
    setError(null);

    if (!newPlaceName.trim()) {
      setError(t.places.nameRequired);
      return;
    }

    const lat = parseFloat(newPlaceLatitude);
    const lon = parseFloat(newPlaceLongitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError(t.places.invalidLatitude);
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      setError(t.places.invalidLongitude);
      return;
    }

    createPlaceMutation.mutate({
      name: newPlaceName.trim(),
      address: newPlaceAddress.trim() || undefined,
      latitude: lat,
      longitude: lon,
      category: newPlaceCategory,
    });
  }, [newPlaceName, newPlaceAddress, newPlaceLatitude, newPlaceLongitude, newPlaceCategory, t, createPlaceMutation]);

  const renderPlaceItem = useCallback(
    ({ item }: { item: Place }) => {
      const isSelected = item.id === selectedPlaceId;
      const icon = CATEGORY_ICONS[item.category] || "map-pin";
      const categoryLabel = t.places.categories[item.category];

      return (
        <Pressable
          style={[
            styles.placeItem,
            { backgroundColor: isSelected ? colors.backgroundSecondary : colors.surface },
          ]}
          onPress={() => {
            onSelect(item);
            handleClose();
          }}
          testID={`place-item-${item.id}`}
        >
          <View style={[styles.placeIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <Feather name={icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.placeInfo}>
            <ThemedText style={styles.placeName}>{item.name}</ThemedText>
            {item.address ? (
              <ThemedText style={[styles.placeAddress, { color: colors.textSecondary }]}>
                {item.address}
              </ThemedText>
            ) : null}
            <ThemedText style={[styles.placeCategory, { color: colors.primary }]}>
              {categoryLabel}
            </ThemedText>
          </View>
          <Pressable
            style={styles.mapsButton}
            onPress={(e) => {
              e.stopPropagation();
              openMapsNavigation({
                latitude: item.latitude,
                longitude: item.longitude,
                label: item.name,
              });
            }}
            testID={`place-maps-${item.id}`}
          >
            <Feather name="navigation" size={18} color={colors.primary} />
          </Pressable>
          {isSelected ? (
            <Feather name="check" size={20} color={colors.primary} />
          ) : null}
        </Pressable>
      );
    },
    [colors, selectedPlaceId, onSelect, handleClose, t]
  );

  const categoryButtons = (["home", "work", "school", "leisure", "other"] as PlaceCategory[]).map(
    (cat) => (
      <Pressable
        key={cat}
        style={[
          styles.categoryButton,
          {
            backgroundColor:
              newPlaceCategory === cat ? colors.primary : colors.backgroundSecondary,
          },
        ]}
        onPress={() => setNewPlaceCategory(cat)}
        testID={`category-${cat}`}
      >
        <Feather
          name={CATEGORY_ICONS[cat]}
          size={16}
          color={newPlaceCategory === cat ? colors.buttonText : colors.text}
        />
        <ThemedText
          style={[
            styles.categoryButtonText,
            { color: newPlaceCategory === cat ? colors.buttonText : colors.text },
          ]}
        >
          {t.places.categories[cat]}
        </ThemedText>
      </Pressable>
    )
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>{t.places.selectPlace}</ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton} testID="close-modal">
              <Feather name="x" size={24} color={colors.text} />
            </Pressable>
          </View>

          {showCreateForm ? (
            <View style={styles.createForm}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={t.places.name}
                placeholderTextColor={colors.textSecondary}
                value={newPlaceName}
                onChangeText={setNewPlaceName}
                testID="input-name"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder={t.places.addressOptional}
                placeholderTextColor={colors.textSecondary}
                value={newPlaceAddress}
                onChangeText={setNewPlaceAddress}
                testID="input-address"
              />
              <View style={styles.coordsRow}>
                <TextInput
                  style={[styles.input, styles.coordInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                  placeholder={t.places.latitude}
                  placeholderTextColor={colors.textSecondary}
                  value={newPlaceLatitude}
                  onChangeText={setNewPlaceLatitude}
                  keyboardType="decimal-pad"
                  testID="input-latitude"
                />
                <TextInput
                  style={[styles.input, styles.coordInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                  placeholder={t.places.longitude}
                  placeholderTextColor={colors.textSecondary}
                  value={newPlaceLongitude}
                  onChangeText={setNewPlaceLongitude}
                  keyboardType="decimal-pad"
                  testID="input-longitude"
                />
              </View>
              <ThemedText style={[styles.label, { color: colors.textSecondary }]}>
                {t.places.category}
              </ThemedText>
              <View style={styles.categoryRow}>{categoryButtons}</View>
              {error ? (
                <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
              ) : null}
              <View style={styles.formButtons}>
                <Pressable
                  style={[styles.button, { backgroundColor: colors.backgroundSecondary }]}
                  onPress={resetCreateForm}
                  testID="cancel-create"
                >
                  <ThemedText>{t.common.cancel}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleCreatePlace}
                  disabled={createPlaceMutation.isPending}
                  testID="confirm-create"
                >
                  <ThemedText style={{ color: colors.buttonText }}>
                    {createPlaceMutation.isPending ? t.common.loading : t.common.save}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.searchRow}>
                <View style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary }]}>
                  <Feather name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchTextInput, { color: colors.text }]}
                    placeholder={t.places.searchOrCreate}
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    testID="search-places"
                  />
                </View>
                <Pressable
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowCreateForm(true)}
                  testID="add-place-button"
                >
                  <Feather name="plus" size={20} color={colors.buttonText} />
                </Pressable>
              </View>

              {isLoading ? (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: colors.textSecondary }}>
                    {t.common.loading}
                  </ThemedText>
                </View>
              ) : filteredPlaces.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="map-pin" size={48} color={colors.textSecondary} />
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {t.places.noPlaces}
                  </ThemedText>
                  <Pressable
                    style={[styles.createButton, { backgroundColor: colors.primary }]}
                    onPress={() => setShowCreateForm(true)}
                  >
                    <Feather name="plus" size={18} color={colors.buttonText} />
                    <ThemedText style={{ color: colors.buttonText, marginLeft: Spacing.xs }}>
                      {t.places.createNew}
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={filteredPlaces}
                  renderItem={renderPlaceItem}
                  keyExtractor={(item) => item.id}
                  style={styles.list}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
    minHeight: 400,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    height: Spacing.inputHeight,
  },
  searchTextInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  addButton: {
    width: Spacing.inputHeight,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  placeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "500",
  },
  placeAddress: {
    fontSize: 13,
    marginTop: 2,
  },
  placeCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  mapsButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  createForm: {
    flex: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  coordsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  coordInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  categoryButtonText: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 14,
    marginBottom: Spacing.md,
  },
  formButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: "auto",
  },
  button: {
    flex: 1,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
});
