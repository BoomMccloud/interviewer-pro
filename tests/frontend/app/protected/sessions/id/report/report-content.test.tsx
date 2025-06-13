import { render, screen, waitFor } from '@testing-library/react';
import ReportContent from '~/app/(protected)/sessions/[id]/report/report-content';
import { api } from '~/trpc/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; 