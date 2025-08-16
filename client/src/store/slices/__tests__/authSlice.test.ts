import authReducer, {
    setCredentials,
    clearCredentials,
    setLoading,
    setError,
    clearError,
    AuthState,
} from '../authSlice';

describe('authSlice', () => {
    const initialState: AuthState = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
    };

    it('should return the initial state', () => {
        expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    describe('setCredentials', () => {
        it('should set user and token', () => {
            const user = { id: '1', email: 'test@example.com', name: 'Test User' };
            const token = 'access-token';

            const actual = authReducer(initialState, setCredentials({ user, token }));

            expect(actual.user).toEqual(user);
            expect(actual.token).toEqual(token);
            expect(actual.isAuthenticated).toBe(true);
            expect(actual.isLoading).toBe(false);
            expect(actual.error).toBeNull();
        });

        it('should update existing state', () => {
            const currentState: AuthState = {
                user: { id: '1', email: 'old@example.com' },
                token: 'old-token',
                isAuthenticated: true,
                isLoading: true,
                error: 'Some error',
            };

            const newUser = { id: '2', email: 'new@example.com', name: 'New User' };
            const newToken = 'new-token';

            const actual = authReducer(currentState, setCredentials({ user: newUser, token: newToken }));

            expect(actual.user).toEqual(newUser);
            expect(actual.token).toEqual(newToken);
            expect(actual.isAuthenticated).toBe(true);
            expect(actual.isLoading).toBe(false);
            expect(actual.error).toBeNull();
        });
    });

    describe('clearCredentials', () => {
        it('should clear user and token', () => {
            const currentState: AuthState = {
                user: { id: '1', email: 'test@example.com' },
                token: 'access-token',
                isAuthenticated: true,
                isLoading: false,
                error: null,
            };

            const actual = authReducer(currentState, clearCredentials());

            expect(actual.user).toBeNull();
            expect(actual.token).toBeNull();
            expect(actual.isAuthenticated).toBe(false);
            expect(actual.isLoading).toBe(false);
            expect(actual.error).toBeNull();
        });

        it('should clear error when clearing credentials', () => {
            const currentState: AuthState = {
                user: { id: '1', email: 'test@example.com' },
                token: 'access-token',
                isAuthenticated: true,
                isLoading: false,
                error: 'Some error',
            };

            const actual = authReducer(currentState, clearCredentials());

            expect(actual.error).toBeNull();
        });
    });

    describe('setLoading', () => {
        it('should set loading to true', () => {
            const actual = authReducer(initialState, setLoading(true));

            expect(actual.isLoading).toBe(true);
            expect(actual.error).toBeNull();
        });

        it('should set loading to false', () => {
            const currentState: AuthState = {
                ...initialState,
                isLoading: true,
                error: 'Some error',
            };

            const actual = authReducer(currentState, setLoading(false));

            expect(actual.isLoading).toBe(false);
            expect(actual.error).toBeNull();
        });

        it('should clear error when setting loading', () => {
            const currentState: AuthState = {
                ...initialState,
                error: 'Some error',
            };

            const actual = authReducer(currentState, setLoading(true));

            expect(actual.error).toBeNull();
        });
    });

    describe('setError', () => {
        it('should set error message', () => {
            const errorMessage = 'Authentication failed';
            const actual = authReducer(initialState, setError(errorMessage));

            expect(actual.error).toBe(errorMessage);
            expect(actual.isLoading).toBe(false);
        });

        it('should set loading to false when setting error', () => {
            const currentState: AuthState = {
                ...initialState,
                isLoading: true,
            };

            const actual = authReducer(currentState, setError('Error occurred'));

            expect(actual.isLoading).toBe(false);
            expect(actual.error).toBe('Error occurred');
        });

        it('should overwrite existing error', () => {
            const currentState: AuthState = {
                ...initialState,
                error: 'Old error',
            };

            const actual = authReducer(currentState, setError('New error'));

            expect(actual.error).toBe('New error');
        });
    });

    describe('clearError', () => {
        it('should clear error message', () => {
            const currentState: AuthState = {
                ...initialState,
                error: 'Some error',
            };

            const actual = authReducer(currentState, clearError());

            expect(actual.error).toBeNull();
        });

        it('should not affect other state properties', () => {
            const currentState: AuthState = {
                user: { id: '1', email: 'test@example.com' },
                token: 'access-token',
                isAuthenticated: true,
                isLoading: true,
                error: 'Some error',
            };

            const actual = authReducer(currentState, clearError());

            expect(actual.user).toEqual(currentState.user);
            expect(actual.token).toEqual(currentState.token);
            expect(actual.isAuthenticated).toBe(true);
            expect(actual.isLoading).toBe(true);
            expect(actual.error).toBeNull();
        });
    });

    describe('Complex state transitions', () => {
        it('should handle login flow', () => {
            // Start loading
            let state = authReducer(initialState, setLoading(true));
            expect(state.isLoading).toBe(true);
            expect(state.error).toBeNull();

            // Login success
            const user = { id: '1', email: 'test@example.com' };
            const token = 'access-token';
            state = authReducer(state, setCredentials({ user, token }));

            expect(state.user).toEqual(user);
            expect(state.token).toEqual(token);
            expect(state.isAuthenticated).toBe(true);
            expect(state.isLoading).toBe(false);
            expect