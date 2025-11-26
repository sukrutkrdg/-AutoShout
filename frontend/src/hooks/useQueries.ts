import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, ScheduledPost, PostStatus } from '../backend';
import { toast } from 'sonner';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to save profile: ' + error.message);
    },
  });
}

export function useGetUserScheduledPosts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<ScheduledPost[]>({
    queryKey: ['userScheduledPosts'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserScheduledPosts();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useCreateScheduledPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: ScheduledPost) => {
      if (!actor) throw new Error('Actor not available');
      await actor.createScheduledPost(post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyPostCount'] });
      queryClient.invalidateQueries({ queryKey: ['remainingWeeklyPosts'] });
      toast.success('Post scheduled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateScheduledPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (post: ScheduledPost) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateScheduledPost(post);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      toast.success('Post updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update post: ' + error.message);
    },
  });
}

export function useDeleteScheduledPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.deleteScheduledPost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userScheduledPosts'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyPostCount'] });
      queryClient.invalidateQueries({ queryKey: ['remainingWeeklyPosts'] });
      toast.success('Post deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete post: ' + error.message);
    },
  });
}

export function useGetWeeklyPostCount() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['weeklyPostCount'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getWeeklyPostCount();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetRemainingWeeklyPosts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['remainingWeeklyPosts'],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getRemainingWeeklyPosts();
    },
    enabled: !!actor && !actorFetching,
  });
}
