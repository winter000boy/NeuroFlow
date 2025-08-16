import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface Execution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt: string;
  finishedAt?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  errorMessage?: string;
  n8nExecutionId?: string;
  userId: string;
  workflow?: {
    id: string;
    name: string;
  };
}

export interface ExecutionFilters {
  status?: string;
  workflowId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ExecutionAnalytics {
  totalExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  executionsByStatus: Record<string, number>;
  executionTrends: Array<{
    date: string;
    count: number;
    successCount: number;
    failureCount: number;
  }>;
}

export interface ExecutionState {
  executions: Execution[];
  currentExecution: Execution | null;
  analytics: ExecutionAnalytics | null;
  isLoading: boolean;
  error: string | null;
  filters: ExecutionFilters;
  pagination: PaginationMeta;
  realTimeUpdates: boolean;
}

const initialState: ExecutionState = {
  executions: [],
  currentExecution: null,
  analytics: null,
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  realTimeUpdates: false,
};

// Async thunks
export const fetchExecutions = createAsyncThunk(
  'executions/fetchAll',
  async (params: { page?: number; limit?: number; filters?: ExecutionFilters }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.filters) {
        Object.entries(params.filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      
      const response = await fetch(`/api/executions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to fetch executions');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const fetchExecutionById = createAsyncThunk(
  'executions/fetchById',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/executions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to fetch execution');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const fetchExecutionAnalytics = createAsyncThunk(
  'executions/fetchAnalytics',
  async (params: { workflowId?: string; dateFrom?: string; dateTo?: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const queryParams = new URLSearchParams();
      if (params.workflowId) queryParams.append('workflowId', params.workflowId);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
      if (params.dateTo) queryParams.append('dateTo', params.dateTo);
      
      const response = await fetch(`/api/executions/analytics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to fetch analytics');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const retryExecution = createAsyncThunk(
  'executions/retry',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/executions/${id}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to retry execution');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const cancelExecution = createAsyncThunk(
  'executions/cancel',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/executions/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to cancel execution');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

const executionSlice = createSlice({
  name: 'executions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentExecution: (state, action: PayloadAction<Execution | null>) => {
      state.currentExecution = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ExecutionFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setPagination: (state, action: PayloadAction<Partial<PaginationMeta>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setRealTimeUpdates: (state, action: PayloadAction<boolean>) => {
      state.realTimeUpdates = action.payload;
    },
    // Real-time update handlers
    updateExecutionStatus: (state, action: PayloadAction<{ id: string; status: Execution['status']; finishedAt?: string; outputData?: any; errorMessage?: string }>) => {
      const execution = state.executions.find(e => e.id === action.payload.id);
      if (execution) {
        execution.status = action.payload.status;
        if (action.payload.finishedAt) execution.finishedAt = action.payload.finishedAt;
        if (action.payload.outputData) execution.outputData = action.payload.outputData;
        if (action.payload.errorMessage) execution.errorMessage = action.payload.errorMessage;
      }
      
      if (state.currentExecution?.id === action.payload.id) {
        state.currentExecution.status = action.payload.status;
        if (action.payload.finishedAt) state.currentExecution.finishedAt = action.payload.finishedAt;
        if (action.payload.outputData) state.currentExecution.outputData = action.payload.outputData;
        if (action.payload.errorMessage) state.currentExecution.errorMessage = action.payload.errorMessage;
      }
    },
    addNewExecution: (state, action: PayloadAction<Execution>) => {
      state.executions.unshift(action.payload);
      state.pagination.total += 1;
    },
    removeExecution: (state, action: PayloadAction<string>) => {
      state.executions = state.executions.filter(e => e.id !== action.payload);
      if (state.currentExecution?.id === action.payload) {
        state.currentExecution = null;
      }
      state.pagination.total -= 1;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch executions
      .addCase(fetchExecutions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions = action.payload.data;
        state.pagination = action.payload.meta.pagination;
        state.error = null;
      })
      .addCase(fetchExecutions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch execution by ID
      .addCase(fetchExecutionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExecutionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentExecution = action.payload;
        state.error = null;
      })
      .addCase(fetchExecutionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch analytics
      .addCase(fetchExecutionAnalytics.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchExecutionAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
        state.error = null;
      })
      .addCase(fetchExecutionAnalytics.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Retry execution
      .addCase(retryExecution.pending, (state) => {
        state.error = null;
      })
      .addCase(retryExecution.fulfilled, (state, action) => {
        // Add the new execution to the list
        state.executions.unshift(action.payload);
        state.error = null;
      })
      .addCase(retryExecution.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Cancel execution
      .addCase(cancelExecution.pending, (state) => {
        state.error = null;
      })
      .addCase(cancelExecution.fulfilled, (state, action) => {
        const execution = state.executions.find(e => e.id === action.payload.id);
        if (execution) {
          execution.status = action.payload.status;
        }
        if (state.currentExecution?.id === action.payload.id) {
          state.currentExecution.status = action.payload.status;
        }
        state.error = null;
      })
      .addCase(cancelExecution.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentExecution,
  setFilters,
  clearFilters,
  setPagination,
  setRealTimeUpdates,
  updateExecutionStatus,
  addNewExecution,
  removeExecution,
} = executionSlice.actions;

export default executionSlice.reducer;