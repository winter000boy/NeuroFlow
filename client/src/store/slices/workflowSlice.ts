import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  status: 'draft' | 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status?: string;
    search?: string;
  };
}

const initialState: WorkflowState = {
  workflows: [],
  currentWorkflow: null,
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchWorkflows = createAsyncThunk(
  'workflows/fetchAll',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch('/api/workflows', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to fetch workflows');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const fetchWorkflowById = createAsyncThunk(
  'workflows/fetchById',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/workflows/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to fetch workflow');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const createWorkflow = createAsyncThunk(
  'workflows/create',
  async (workflowData: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to create workflow');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const updateWorkflow = createAsyncThunk(
  'workflows/update',
  async ({ id, ...workflowData }: Partial<Workflow> & { id: string }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(workflowData),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to update workflow');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const deleteWorkflow = createAsyncThunk(
  'workflows/delete',
  async (id: string, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to delete workflow');
      }

      return id;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

export const executeWorkflow = createAsyncThunk(
  'workflows/execute',
  async ({ id, inputData }: { id: string; inputData?: any }, { rejectWithValue, getState }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;
      
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inputData }),
      });

      if (!response.ok) {
        const error = await response.json();
        return rejectWithValue(error.error?.message || 'Failed to execute workflow');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue('Network error occurred');
    }
  }
);

const workflowSlice = createSlice({
  name: 'workflows',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentWorkflow: (state, action: PayloadAction<Workflow | null>) => {
      state.currentWorkflow = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<WorkflowState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    updateWorkflowInList: (state, action: PayloadAction<Workflow>) => {
      const index = state.workflows.findIndex(w => w.id === action.payload.id);
      if (index !== -1) {
        state.workflows[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workflows
      .addCase(fetchWorkflows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkflows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Fetch workflow by ID
      .addCase(fetchWorkflowById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkflowById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentWorkflow = action.payload;
        state.error = null;
      })
      .addCase(fetchWorkflowById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create workflow
      .addCase(createWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows.push(action.payload);
        state.currentWorkflow = action.payload;
        state.error = null;
      })
      .addCase(createWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update workflow
      .addCase(updateWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.workflows.findIndex(w => w.id === action.payload.id);
        if (index !== -1) {
          state.workflows[index] = action.payload;
        }
        if (state.currentWorkflow?.id === action.payload.id) {
          state.currentWorkflow = action.payload;
        }
        state.error = null;
      })
      .addCase(updateWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete workflow
      .addCase(deleteWorkflow.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteWorkflow.fulfilled, (state, action) => {
        state.isLoading = false;
        state.workflows = state.workflows.filter(w => w.id !== action.payload);
        if (state.currentWorkflow?.id === action.payload) {
          state.currentWorkflow = null;
        }
        state.error = null;
      })
      .addCase(deleteWorkflow.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Execute workflow
      .addCase(executeWorkflow.pending, (state) => {
        state.error = null;
      })
      .addCase(executeWorkflow.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(executeWorkflow.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  setCurrentWorkflow, 
  setFilters, 
  clearFilters, 
  updateWorkflowInList 
} = workflowSlice.actions;

export default workflowSlice.reducer;