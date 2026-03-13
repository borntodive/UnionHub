# UnionConnect – Frontend Architecture (Expo + React Native)

## 1. Framework Choice: Expo + React Native

### Motivation

UnionConnect uses **Expo** as the development framework, built on top of **React Native** for true native iOS/Android applications.

| Criterion | Expo + React Native | Ionic + Angular |
|-----------|---------------------|-----------------|
| Native Performance | True native UI (60fps) | WebView-based |
| App Store Distribution | Native app experience | Hybrid web app |
| OTA Updates | ✅ Expo Updates without app store review | Requires Capacitor sync |
| PDF Processing | Native PDF rendering and extraction | Web-based PDF.js |
| Push Notifications | Native Firebase/APNs integration | Plugin-based, less reliable |
| Camera/Scanner | Native camera access for documents | Web APIs limited |
| Offline Storage | SQLite/AsyncStorage native | LocalStorage/IndexedDB |
| Development Speed | Hot reload, Expo Go for testing | Live reload, device testing |
| Long-term maintenance | Meta-backed RN, Expo managed workflow | Ionic/Capacitor updates |

**Conclusion**: For an app distributed to all CISL union members with PDF processing, offline capabilities, and professional quality requirements, Expo provides superior native performance and user experience.

**Chosen stack:**
- Expo SDK 52+ with React Native 0.76+
- React 18+ with TypeScript
- React Navigation 6+ for routing
- TanStack Query 5+ for server state management
- Zustand 5+ for client state management
- React Hook Form for forms
- Expo Router (optional) or React Navigation

> **NOTE v1.1:** Unified User=Member model (single table). Login via crewcode+password. Role field (pilot/cabin_crew) with specific grades. Admin scoped by role.
>
> **NOTE v1.2:** **Grades** are now a CRUD entity managed by SuperAdmin (like Bases and Contracts). Each grade has code + name + role.
>
> **NOTE v1.3:** Migrated from Ionic/Angular to Expo/React Native for true native app experience.

---

## 2. Project Structure

```
union-connect-app/
├── src/
│   ├── api/                          # API client & types
│   │   ├── client.ts                 # Axios instance with interceptors
│   │   ├── types.ts                  # Shared DTOs with backend
│   │   ├── auth.ts                   # Auth endpoints
│   │   ├── members.ts                # Members endpoints
│   │   ├── bases.ts                  # Bases endpoints
│   │   ├── contracts.ts              # Contracts endpoints
│   │   ├── grades.ts                 # Grades endpoints
│   │   ├── pdf-field-mappings.ts     # PDF mapping config
│   │   ├── excel-field-mappings.ts   # Excel mapping config
│   │   └── bulk-import.ts            # Bulk import endpoints
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── common/                   # Shared components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── EmptyState.tsx
│   │   │
│   │   ├── members/                  # Member-related components
│   │   │   ├── MemberCard.tsx
│   │   │   ├── MemberForm.tsx
│   │   │   ├── MemberList.tsx
│   │   │   └── MemberSearch.tsx
│   │   │
│   │   ├── forms/                    # Form field components
│   │   │   ├── BaseSelect.tsx
│   │   │   ├── ContractSelect.tsx
│   │   │   ├── RoleSelect.tsx
│   │   │   ├── GradeSelect.tsx
│   │   │   └── PhoneInput.tsx
│   │   │
│   │   └── pdf/                      # PDF processing components
│   │       ├── PdfUploader.tsx
│   │       ├── PdfPreview.tsx
│   │       └── ExtractionStatus.tsx
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts                # Auth + biometric
│   │   ├── useMembers.ts             # TanStack Query hooks
│   │   ├── useBases.ts
│   │   ├── useContracts.ts
│   │   ├── useGrades.ts
│   │   ├── usePdfExtraction.ts       # PDF processing
│   │   └── useBulkImport.ts          # Bulk import wizard
│   │
│   ├── navigation/                   # React Navigation
│   │   ├── AppNavigator.tsx          # Root navigator
│   │   ├── AuthNavigator.tsx         # Auth flow (login, password change)
│   │   ├── AdminNavigator.tsx        # Admin tab navigator
│   │   ├── UserNavigator.tsx         # User tab navigator
│   │   ├── SuperAdminNavigator.tsx   # SuperAdmin extended tabs
│   │   └── types.ts                  # Navigation type definitions
│   │
│   ├── screens/                      # Screen components
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── ChangePasswordScreen.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   │
│   │   ├── members/
│   │   │   ├── MemberListScreen.tsx
│   │   │   ├── MemberDetailScreen.tsx
│   │   │   └── MemberFormScreen.tsx
│   │   │
│   │   ├── profile/
│   │   │   └── ProfileScreen.tsx
│   │   │
│   │   ├── admin/                    # SuperAdmin only
│   │   │   ├── BasesScreen.tsx
│   │   │   ├── BasesFormScreen.tsx
│   │   │   ├── ContractsScreen.tsx
│   │   │   ├── ContractsFormScreen.tsx
│   │   │   ├── GradesScreen.tsx
│   │   │   ├── GradesFormScreen.tsx
│   │   │   ├── PdfFieldMappingsScreen.tsx
│   │   │   ├── ExcelFieldMappingsScreen.tsx
│   │   │   └── AdminsScreen.tsx
│   │   │
│   │   ├── bulk-import/
│   │   │   ├── ImportUploadScreen.tsx     # Step 1
│   │   │   ├── ImportPreviewScreen.tsx    # Step 2
│   │   │   ├── ImportOptionsScreen.tsx    # Step 3
│   │   │   └── ImportResultsScreen.tsx    # Step 4
│   │   │
│   │   └── tools/
│   │       └── ToolsScreen.tsx
│   │
│   ├── store/                        # Global state (Zustand)
│   │   ├── authStore.ts              # Auth state + persistence
│   │   ├── uiStore.ts                # UI preferences (theme, etc.)
│   │   └── createStore.ts            # Store factory with persistence
│   │
│   ├── utils/                        # Utilities
│   │   ├── pdfExtractor.ts           # PDF extraction helpers
│   │   ├── validation.ts             # Form validation
│   │   ├── formatters.ts             # Date, phone formatters
│   │   └── constants.ts              # App constants
│   │
│   ├── theme/                        # Styling
│   │   ├── colors.ts                 # Color palette
│   │   ├── typography.ts             # Font styles
│   │   ├── spacing.ts                # Layout constants
│   │   └── index.ts                  # Theme exports
│   │
│   ├── types/                        # TypeScript types
│   │   ├── models.ts                 # Domain models
│   │   ├── navigation.ts             # Navigation types
│   │   └── api.ts                    # API response types
│   │
│   └── App.tsx                       # Entry point
│
├── assets/                           # Static assets
│   ├── images/
│   ├── fonts/
│   └── icon.png                      # App icon
│
├── app.json                          # Expo configuration
├── eas.json                          # EAS Build configuration
├── babel.config.js                   # Babel configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

---

## 3. Component List and Responsibilities

### Screens

| Screen | Role | Responsibility |
|--------|------|----------------|
| `LoginScreen` | all | Login form crewcode+password, biometric prompt after first successful login |
| `ChangePasswordScreen` | all | Mandatory password change for new users (`must_change_password=true`) |
| `DashboardScreen` | all | Post-login home, KPI cards differentiated by role |
| `MemberListScreen` | Admin, SuperAdmin | Members list with filters, search, infinite scroll |
| `MemberDetailScreen` | Admin, SuperAdmin | View + edit member, fields restricted by role |
| `MemberFormScreen` | Admin, SuperAdmin | Member creation: manual or with PDF-extracted data |
| `ProfileScreen` | User | Personal profile view (without notes/ITUD/RSA), edit phone |
| `BasesScreen` | SuperAdmin | CRUD airport bases list |
| `BasesFormScreen` | SuperAdmin | Base creation/edit form (code + name) |
| `ContractsScreen` | SuperAdmin | CRUD contracts list |
| `ContractsFormScreen` | SuperAdmin | Contract creation/edit form |
| `GradesScreen` | SuperAdmin | CRUD grades list, filter by role |
| `GradesFormScreen` | SuperAdmin | Grade creation/edit form (code + name + role) |
| `PdfFieldMappingsScreen` | SuperAdmin | CRUD PDF field mappings per role |
| `ExcelFieldMappingsScreen` | SuperAdmin | CRUD Excel import templates per role |
| `ImportUploadScreen` | Admin, SuperAdmin | Step 1: Upload Excel/CSV with role selection |
| `ImportPreviewScreen` | Admin, SuperAdmin | Step 2: Preview data, validation errors, duplicates |
| `ImportOptionsScreen` | Admin, SuperAdmin | Step 3: Configure import options |
| `ImportResultsScreen` | Admin, SuperAdmin | Step 4: Import progress and results summary |
| `ToolsScreen` | all | Extensible tools section (future features) |

### Shared Components

| Component | Responsibility |
|-----------|----------------|
| `MemberCard` | Card display of member summary info, press to navigate |
| `MemberForm` | Complete member form with all fields; accepts `readOnlyFields` and `hiddenFields` props |
| `MemberList` | FlatList with pull-to-refresh, search, role filter |
| `BaseSelect` | Picker populated with bases from API, displays `codice – nome` |
| `ContractSelect` | Picker populated with contracts from API |
| `RoleSelect` | Picker with Pilot / Cabin Crew options |
| `GradeSelect` | Picker with grades from API, filtered by selected role |
| `PdfUploader` | PDF file selection, native file picker, preview trigger |
| `PdfPreview` | Native PDF rendering with zoom, page navigation |
| `ExtractionStatus` | Badge showing extraction method (form fields / OCR / manual) |
| `ExcelUploader` | Excel/CSV file selection, role selection |
| `ImportPreviewTable` | Virtualized list showing import preview with status icons |
| `ImportProgress` | Progress bar with real-time stats |
| `FieldMappingGrid` | Draggable grid for configuring field mappings |
| `ConfirmDialog` | Native confirmation alert |

---

## 4. Navigation System

### Stack Navigator Structure

```typescript
// navigation/AppNavigator.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AdminNavigator } from './AdminNavigator';
import { UserNavigator } from './UserNavigator';
import { SuperAdminNavigator } from './SuperAdminNavigator';

const Stack = createNativeStackNavigator();

export const AppNavigator = () => {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Route based on role
  switch (user?.role) {
    case 'SuperAdmin':
      return <SuperAdminNavigator />;
    case 'Admin':
      return <AdminNavigator />;
    case 'User':
    default:
      return <UserNavigator />;
  }
};
```

### Auth Navigator

```typescript
// navigation/AuthNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen 
      name="ChangePassword" 
      component={ChangePasswordScreen}
      options={{ headerShown: true, title: 'Change Password' }}
    />
  </Stack.Navigator>
);
```

### Admin Navigator (Tab + Stack)

```typescript
// navigation/AdminNavigator.tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';

const Tab = createBottomTabNavigator();
const MembersStack = createNativeStackNavigator();

const MembersStackNavigator = () => (
  <MembersStack.Navigator>
    <MembersStack.Screen name="MemberList" component={MemberListScreen} />
    <MembersStack.Screen name="MemberDetail" component={MemberDetailScreen} />
    <MembersStack.Screen name="MemberForm" component={MemberFormScreen} />
  </MembersStack.Navigator>
);

export const AdminNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, string> = {
            Dashboard: 'home',
            Members: 'people',
            Import: 'cloud-upload',
            Tools: 'construct',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#177246',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Members" component={MembersStackNavigator} />
      <Tab.Screen name="Import" component={BulkImportNavigator} />
      <Tab.Screen name="Tools" component={ToolsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);
```

---

## 5. State Management

### Solution: TanStack Query + Zustand

**TanStack Query (React Query)** for server state:
- Caching, background refetching, stale-while-revalidate
- Automatic loading/error states
- Optimistic updates
- Offline support with persistence

**Zustand** for client state:
- Auth state with AsyncStorage persistence
- UI preferences (theme, etc.)
- Simple, unopinionated, minimal boilerplate

### Auth Store with Persistence

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types/models';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (auth: { user: User; accessToken: string; refreshToken: string }) => void;
  updateUser: (user: Partial<User>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      
      setAuth: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### TanStack Query Hooks

```typescript
// hooks/useMembers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../api/members';
import { useAuthStore } from '../store/authStore';

export const useMembers = (filters?: MembersFilter) => {
  return useQuery({
    queryKey: ['members', filters],
    queryFn: () => membersApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMember = (id: string) => {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
};

export const useExtractPdf = () => {
  const { user } = useAuthStore();
  
  return useMutation({
    mutationFn: ({ file, role }: { file: File; role: 'pilot' | 'cabin_crew' }) =>
      membersApi.extractPdf(file, role),
  });
};
```

---

## 6. HTTP Services – Communication with NestJS Backend

### Axios Client Configuration

```typescript
// api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import { refreshToken } from './auth';

const apiClient = axios.create({
  baseURL: 'https://api.unionconnect.cisl.it/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { refreshToken: currentRefresh } = useAuthStore.getState();
        if (!currentRefresh) throw new Error('No refresh token');
        
        const { accessToken, refreshToken: newRefresh } = await refreshToken(currentRefresh);
        useAuthStore.getState().setAuth({
          ...useAuthStore.getState(),
          accessToken,
          refreshToken: newRefresh,
        });
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

### API Functions

```typescript
// api/members.ts
import apiClient from './client';
import { Member, CreateMemberDto, UpdateMemberDto, PaginatedResponse } from '../types/models';

export const membersApi = {
  getAll: async (filters?: MembersFilter): Promise<PaginatedResponse<Member>> => {
    const { data } = await apiClient.get('/members', { params: filters });
    return data;
  },

  getById: async (id: string): Promise<Member> => {
    const { data } = await apiClient.get(`/members/${id}`);
    return data;
  },

  create: async (dto: CreateMemberDto): Promise<Member> => {
    const { data } = await apiClient.post('/members', dto);
    return data;
  },

  update: async (id: string, dto: UpdateMemberDto): Promise<Member> => {
    const { data } = await apiClient.put(`/members/${id}`, dto);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/members/${id}`);
  },

  extractPdf: async (file: File, role: 'pilot' | 'cabin_crew'): Promise<ExtractionResult> => {
    const formData = new FormData();
    formData.append('pdf', file as any);
    formData.append('role', role);
    
    const { data } = await apiClient.post('/members/extract-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
```

---

## 7. JWT Authentication Management

### Secure Token Storage

```typescript
// utils/secureStorage.ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  async saveToken(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async getToken(key: string): Promise<string | null> {
    return await SecureStore.getItemAsync(key);
  },

  async deleteToken(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
```

### Biometric Authentication

```typescript
// hooks/useBiometric.ts
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../store/authStore';

export const useBiometric = () => {
  const { user, setAuth } = useAuthStore();

  const isAvailable = async (): Promise<boolean> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  };

  const authenticate = async (): Promise<boolean> => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access UnionConnect',
      fallbackLabel: 'Use password',
      disableDeviceFallback: false,
    });
    return result.success;
  };

  const enableBiometric = async (): Promise<void> => {
    const success = await authenticate();
    if (success) {
      // Store preference in SecureStore
      await SecureStore.setItemAsync('biometric_enabled', 'true');
    }
  };

  return { isAvailable, authenticate, enableBiometric };
};
```

---

## 8. PDF Processing

### Native PDF Handling

```typescript
// components/pdf/PdfUploader.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useExtractPdf } from '../../hooks/useMembers';

interface PdfUploaderProps {
  onExtracted: (data: ExtractedMemberData) => void;
  role: 'pilot' | 'cabin_crew';
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onExtracted, role }) => {
  const extractPdf = useExtractPdf();
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setSelectedFile(file);
      
      // Extract data
      extractPdf.mutate(
        { file: file as any, role },
        {
          onSuccess: (data) => {
            onExtracted(data);
          },
        }
      );
    }
  };

  return (
    <TouchableOpacity onPress={pickDocument} style={styles.uploadArea}>
      <Ionicons name="cloud-upload" size={48} color="#177246" />
      <Text>Tap to select PDF</Text>
      {extractPdf.isPending && <ActivityIndicator />}
      {selectedFile && <Text>{selectedFile.name}</Text>}
    </TouchableOpacity>
  );
};
```

### PDF Preview with react-native-pdf

```typescript
// components/pdf/PdfPreview.tsx
import Pdf from 'react-native-pdf';
import { View, Dimensions } from 'react-native';

interface PdfPreviewProps {
  uri: string;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({ uri }) => {
  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri }}
        style={styles.pdf}
        onLoadComplete={(numberOfPages) => {
          console.log(`PDF loaded: ${numberOfPages} pages`);
        }}
        onPageChanged={(page, numberOfPages) => {
          console.log(`Page ${page}/${numberOfPages}`);
        }}
        onError={(error) => {
          console.error('PDF error:', error);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
```


---

## 9. Reusable Components

### Form Components with React Hook Form

```typescript
// components/members/MemberForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { View, Text, TextInput, Switch } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { RoleSelect } from '../forms/RoleSelect';
import { GradeSelect } from '../forms/GradeSelect';
import { BaseSelect } from '../forms/BaseSelect';

interface MemberFormProps {
  defaultValues?: Partial<MemberFormData>;
  onSubmit: (data: MemberFormData) => void;
  mode: 'create' | 'edit';
}

interface MemberFormData {
  nome: string;
  cognome: string;
  email: string;
  crewcode: string;
  telefono?: string;
  ruolo: 'pilot' | 'cabin_crew';
  baseId: string;
  contrattoId: string;
  gradeId: string;
  note?: string;
  itud: boolean;
  rsa: boolean;
}

export const MemberForm: React.FC<MemberFormProps> = ({ 
  defaultValues, 
  onSubmit,
  mode 
}) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
  
  const { control, handleSubmit, watch, formState: { errors } } = useForm<MemberFormData>({
    defaultValues: {
      nome: '',
      cognome: '',
      email: '',
      crewcode: '',
      itud: false,
      rsa: false,
      ...defaultValues,
    },
  });

  const selectedRole = watch('ruolo');

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="nome"
        rules={{ required: 'First name is required' }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text>First Name</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="Enter first name"
            />
            {errors.nome && <Text style={styles.error}>{errors.nome.message}</Text>}
          </View>
        )}
      />

      <Controller
        control={control}
        name="cognome"
        rules={{ required: 'Last name is required' }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text>Last Name</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="Enter last name"
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="crewcode"
        rules={{ required: 'Crew code is required' }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text>Crew Code</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="Enter crew code"
              autoCapitalize="characters"
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="email"
        rules={{ 
          required: 'Email is required',
          pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
        }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.field}>
            <Text>Email</Text>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={onChange}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="ruolo"
        rules={{ required: 'Role is required' }}
        render={({ field: { onChange, value } }) => (
          <RoleSelect
            value={value}
            onSelect={onChange}
          />
        )}
      />

      {selectedRole && (
        <Controller
          control={control}
          name="gradeId"
          rules={{ required: 'Grade is required' }}
          render={({ field: { onChange, value } }) => (
            <GradeSelect
              ruolo={selectedRole}
              value={value}
              onSelect={onChange}
            />
          )}
        />
      )}

      {/* Admin-only fields */}
      {isAdmin && (
        <>
          <Controller
            control={control}
            name="note"
            render={({ field: { onChange, value } }) => (
              <View style={styles.field}>
                <Text>Notes (Admin only)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="Internal notes"
                  multiline
                  numberOfLines={4}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="itud"
            render={({ field: { onChange, value } }) => (
              <View style={styles.row}>
                <Text>ITUD (Fixed-term contract)</Text>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />

          <Controller
            control={control}
            name="rsa"
            render={({ field: { onChange, value } }) => (
              <View style={styles.row}>
                <Text>RSA (Union representative)</Text>
                <Switch value={value} onValueChange={onChange} />
              </View>
            )}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  field: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  error: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },
});
```

### Select Components

```typescript
// components/forms/GradeSelect.tsx
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useGradesByRole } from '../../hooks/useGrades';

interface GradeSelectProps {
  ruolo: 'pilot' | 'cabin_crew';
  value?: string;
  onSelect: (gradeId: string) => void;
}

export const GradeSelect: React.FC<GradeSelectProps> = ({ ruolo, value, onSelect }) => {
  const { data: grades, isLoading } = useGradesByRole(ruolo);

  useEffect(() => {
    // Reset value when role changes
    if (value && !grades?.find(g => g.id === value)) {
      onSelect('');
    }
  }, [ruolo]);

  if (isLoading) return <Text>Loading grades...</Text>;

  return (
    <View style={styles.container}>
      <Text>Grade</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={value}
          onValueChange={onSelect}
        >
          <Picker.Item label="Select grade..." value="" />
          {grades?.map((grade) => (
            <Picker.Item
              key={grade.id}
              label={`${grade.codice} – ${grade.nome}`}
              value={grade.id}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
};
```

---

## 10. Expo Configuration

### `app.json`

```json
{
  "expo": {
    "name": "UnionConnect",
    "slug": "union-connect",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#177246"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "it.cisl.unionconnect",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID to securely access your account",
        "NSCameraUsageDescription": "Camera access is needed to scan documents"
      }
    },
    "android": {
      "package": "it.cisl.unionconnect",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#177246"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Allow UnionConnect to access your Face ID biometric data."
        }
      ],
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow UnionConnect to use Face ID."
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    },
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### `eas.json` (EAS Build Configuration)

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "your-app-store-id"
      }
    }
  }
}
```

### Required Expo Packages

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "expo-status-bar": "~2.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-file-system": "~18.0.0",
    "expo-updates": "~0.26.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-screens": "~4.0.0",
    "react-native-safe-area-context": "~4.12.0",
    "react-native-gesture-handler": "~2.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.47.0",
    "axios": "^1.6.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "react-native-pdf": "^6.7.0",
    "react-native-blob-util": "^0.19.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.3.0",
    "typescript": "~5.3.0"
  }
}
```

---

## 11. Naming Conventions and Best Practices

### File Naming (React Native conventions)

```
FeatureName.tsx                 # Components (PascalCase)
FeatureName.styles.ts           # Component styles
useFeatureName.ts               # Custom hooks (camelCase with use prefix)
featureName.store.ts            # Zustand stores (camelCase)
featureName.api.ts              # API functions (camelCase)
FeatureName.types.ts            # TypeScript types/interfaces
FeatureName.test.tsx            # Test files
```

### Components and interfaces

```typescript
// Model interfaces: PascalCase
interface Member { ... }
interface Base { ... }
interface Grade { ... }

// DTOs (Data Transfer Objects)
interface CreateMemberDto { ... }
interface UpdateMemberDto { ... }

// Enums
enum UserRole {
  SuperAdmin = 'superadmin',
  Admin = 'admin',
  User = 'user',
}

enum RuoloProfessionale {
  Pilot = 'pilot',
  CabinCrew = 'cabin_crew',
}

// Grade model (CRUD entity)
interface Grade {
  id: string;
  codice: string;           // e.g. "CMD", "FO", "RDC"
  nome: string;             // e.g. "Commander", "First Officer"
  ruolo: RuoloProfessionale; // pilot | cabin_crew
}

// Unified User = Member model
interface User {
  id: string;
  crewcode: string;        // used for login
  role: UserRole;
  ruolo: RuoloProfessionale | null;
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  baseId?: string;
  contrattoId?: string;
  gradeId?: string;
  grade?: Grade;
  // Sensitive fields (Admin/SuperAdmin only)
  note?: string;
  itud?: boolean;
  rsa?: boolean;
  mustChangePassword: boolean;
  isActive: boolean;
}
```

### General conventions

- Use functional components with hooks (no class components)
- Prefer TypeScript strict mode
- Use explicit return types on exported functions
- Props interface naming: `ComponentNameProps`
- Extract styles to separate `.styles.ts` files for complex components
- Use `useCallback` for event handlers passed to children
- Use `useMemo` for expensive computations
- Keep components focused (Single Responsibility Principle)
- Maximum line length: 100 characters

---

## 12. Theme and Styles Management

### Theme Configuration

```typescript
// theme/colors.ts
export const colors = {
  // Brand colors (CISL official)
  primary: '#177246',          // CISL Green
  primaryLight: '#1d8f57',
  primaryDark: '#125a38',
  
  secondary: '#DA0E32',        // CISL Red (CTA)
  secondaryLight: '#f4153d',
  secondaryDark: '#b00b29',
  
  // Semantic colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Grayscale
  white: '#ffffff',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',
};

// theme/spacing.ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// theme/typography.ts
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
```

### StyleSheet Pattern

```typescript
// components/common/Button.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: colors.gray400,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineButtonText: {
    color: colors.primary,
  },
});
```

### Dark Mode Support

```typescript
// hooks/useTheme.ts
import { useColorScheme } from 'react-native';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
  };
};
```

---

## 13. Main Dependencies

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "typescript": "~5.3.0",
    
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-screens": "~4.0.0",
    "react-native-safe-area-context": "~4.12.0",
    
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "react-hook-form": "^7.47.0",
    "axios": "^1.6.0",
    
    "@react-native-async-storage/async-storage": "1.23.1",
    "expo-secure-store": "~14.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-document-picker": "~13.0.0",
    "expo-file-system": "~18.0.0",
    "expo-updates": "~0.26.0",
    
    "react-native-pdf": "^6.7.0",
    "react-native-blob-util": "^0.19.0",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.3.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 14. Project Initialization

```bash
# 1. Create new Expo project
npx create-expo-app union-connect-app --template blank-typescript

# 2. Navigate to project
cd union-connect-app

# 3. Install navigation dependencies
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# 4. Install state management
npm install @tanstack/react-query zustand react-hook-form

# 5. Install storage and native modules
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store expo-local-authentication
npx expo install expo-document-picker expo-file-system

# 6. Install PDF handling
npm install react-native-pdf react-native-blob-util

# 7. Install networking
npm install axios

# 8. Setup EAS (Expo Application Services)
npm install -g eas-cli
eas login
eas build:configure

# 9. Start development
npx expo start

# 10. Run on device/simulator
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR with Expo Go app on physical device
```

### Development Workflow

```bash
# Development with hot reload
npx expo start

# Development with tunnel (for external testing)
npx expo start --tunnel

# Run tests
npm test

# Lint code
npm run lint

# Build for preview (internal distribution)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Build for production
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android

# OTA Update (no app store review needed)
eas update --channel production --message "Bug fixes"
```

---

## 15. Key Differences from Ionic/Angular

| Aspect | Expo/React Native | Ionic/Angular |
|--------|-------------------|---------------|
| **Navigation** | React Navigation (imperative) | Angular Router (declarative) |
| **State Management** | TanStack Query + Zustand | Angular Signals |
| **HTTP Client** | Axios | Angular HttpClient |
| **Forms** | React Hook Form | Angular Reactive Forms |
| **Storage** | AsyncStorage / SecureStore | localStorage / Capacitor Preferences |
| **UI Components** | Custom + React Native Paper/NativeBase | Ionic Components |
| **Styling** | StyleSheet (CSS-in-JS) | SCSS/CSS |
| **PDF Preview** | react-native-pdf (native) | iframe with PDF.js |
| **File Upload** | expo-document-picker | HTML file input |
| **Biometrics** | expo-local-authentication | Capacitor plugin |

---

*This document describes the Expo + React Native frontend architecture for UnionConnect. For backend architecture, see `04-backend-architecture.md`.*
