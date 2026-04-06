import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTemplateService } from '../api/services/emailTemplateService';
import {
  EmailTemplate,
  EmailTemplateDefault,
  EmailTemplateCreateInput,
} from '../types/emailTemplate';

export const useEmailTemplates = () => {
  const query = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: () => emailTemplateService.getTemplates(),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const templates: EmailTemplate[] = query.data?.success
    ? query.data.data.templates
    : [];

  const defaults: EmailTemplateDefault[] = query.data?.success
    ? query.data.data.defaults
    : [];

  return {
    templates,
    defaults,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};

export const useEmailTemplateDefaults = () => {
  const query = useQuery({
    queryKey: ['emailTemplateDefaults'],
    queryFn: () => emailTemplateService.getDefaults(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });

  const defaults: EmailTemplateDefault[] = query.data?.success
    ? query.data.data.defaults
    : [];

  return {
    defaults,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

export const useCreateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EmailTemplateCreateInput) =>
      emailTemplateService.createTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });
};

export const useUpdateEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EmailTemplateCreateInput> }) =>
      emailTemplateService.updateTemplate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });
};

export const useDeleteEmailTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => emailTemplateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });
};
