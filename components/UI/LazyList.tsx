import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  FlatListProps,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

export type FetchPageResult<T> = {
  data: T[];
  hasMore: boolean;
};

export type LazyListProps<T> = {
  /**
   * Async function to fetch a page of items.
   * Receives (page, pageSize) and returns Promise<{ data: T[], hasMore: boolean }>.
   */
  fetchPage: (page: number, pageSize: number) => Promise<FetchPageResult<T>>;
  /** Render function for each item in the list */
  renderItem: FlatListProps<T>["renderItem"];
  /** Key extractor function for items */
  keyExtractor?: (item: T, index: number) => string;
  /** Number of items to fetch per page (Default: 20) */
  pageSize?: number;
  /** Custom empty state title */
  emptyTitle?: string;
  /** Custom empty state description */
  emptySubtitle?: string;
  /** Optional icon component for empty state */
  emptyIcon?: React.ReactNode;
  /** Optional container style */
  contentContainerStyle?: FlatListProps<T>["contentContainerStyle"];
};

/**
 * Production-ready, generic lazy-loaded infinite scrolling list component.
 * Supports batched pagination, pull-to-refresh, loading footers, and empty state handling.
 */
export default function LazyList<T>({
  fetchPage,
  renderItem,
  keyExtractor,
  pageSize = 20,
  emptyTitle = "No Items Found",
  emptySubtitle = "There are no records to display right now.",
  emptyIcon,
  contentContainerStyle,
}: LazyListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState<number>(1);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadInitialData();
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Loads Page 1 data on initial mount or full reset.
   */
  const loadInitialData = async () => {
    setIsInitialLoading(true);
    setError(null);
    try {
      const result = await fetchPage(1, pageSize);
      if (!isMounted.current) return;
      setItems(result.data);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (err: any) {
      if (!isMounted.current) return;
      setError(err.message || "Failed to load items.");
    } finally {
      if (isMounted.current) {
        setIsInitialLoading(false);
      }
    }
  };

  /**
   * Handles pull-to-refresh by resetting back to Page 1.
   */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchPage(1, pageSize);
      if (!isMounted.current) return;
      setItems(result.data);
      setHasMore(result.hasMore);
      setPage(1);
    } catch (err: any) {
      if (!isMounted.current) return;
      setError(err.message || "Failed to refresh list.");
    } finally {
      if (isMounted.current) {
        setIsRefreshing(false);
      }
    }
  }, [fetchPage, pageSize, isRefreshing]);

  /**
   * Triggers next batch fetch when user scrolls close to the bottom.
   */
  const handleEndReached = useCallback(async () => {
    if (!hasMore || isFetchingMore || isInitialLoading || isRefreshing) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;

    try {
      const result = await fetchPage(nextPage, pageSize);
      if (!isMounted.current) return;

      if (result.data.length > 0) {
        setItems((prevItems) => [...prevItems, ...result.data]);
        setPage(nextPage);
      }
      setHasMore(result.hasMore);
    } catch (err: any) {
      console.warn("[LazyList] Failed to fetch page:", nextPage, err);
    } finally {
      if (isMounted.current) {
        setIsFetchingMore(false);
      }
    }
  }, [fetchPage, hasMore, isFetchingMore, isInitialLoading, isRefreshing, page, pageSize]);

  /**
   * Footer component showing loading indicator or end-of-list message.
   */
  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.footerText}>Loading more items...</Text>
        </View>
      );
    }

    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>You've reached the end of the list</Text>
        </View>
      );
    }

    return null;
  };

  /**
   * Empty state placeholder when dataset is empty.
   */
  const renderEmpty = () => {
    if (isInitialLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        {emptyIcon ? <View style={styles.emptyIconBox}>{emptyIcon}</View> : null}
        <Text style={styles.emptyTitle}>{error ? "Error Loading Data" : emptyTitle}</Text>
        <Text style={styles.emptySubtitle}>{error || emptySubtitle}</Text>
      </View>
    );
  };

  if (isInitialLoading) {
    return (
      <View style={styles.initialLoaderContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.initialLoaderText}>Loading items...</Text>
      </View>
    );
  }

  return (
    <FlatList<T>
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor || ((_, index) => index.toString())}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
      contentContainerStyle={[
        styles.listContainer,
        items.length === 0 && styles.listEmptyContainer,
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  listEmptyContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  initialLoaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  initialLoaderText: {
    fontSize: 14,
    color: Colors.muted,
    fontWeight: "600",
  },
  footerLoader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
    color: Colors.muted,
    fontWeight: "600",
  },
  footerEnd: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerEndText: {
    fontSize: 12,
    color: Colors.muted,
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
  },
  emptyIconBox: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.foreground,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
    lineHeight: 18,
  },
});
