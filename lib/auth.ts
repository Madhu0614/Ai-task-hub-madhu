import { supabase } from './supabase';
import type { Profile } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  team: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

// Convert Supabase profile to User
const profileToUser = (profile: Profile): User => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  avatar_url: profile.avatar_url,
  team: profile.team,
});

export const signUp = async (email: string, password: string, name: string): Promise<User> => {
  try {
    // First, sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    // Wait a moment for the trigger to execute
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if profile was created by trigger, if not create manually
    let profile;
    try {
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      profile = existingProfile;
    } catch (error) {
      console.log('Profile not found, creating manually...');
    }

    // If profile doesn't exist, create it manually
    if (!profile) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          name: name,
          team: 'Personal',
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Error creating profile manually:', createError);
        throw new Error(`Failed to create user profile: ${createError.message}`);
      }

      profile = newProfile;
    }

    if (!profile) {
      throw new Error('Failed to create or retrieve user profile');
    }

    return profileToUser(profile);
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
};

export const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.user) {
      throw new Error('Failed to sign in');
    }

    // Get user profile with retry logic
    let profile;
    let retries = 3;
    
    while (retries > 0 && !profile) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
                team: 'Personal',
              })
              .select('*')
              .single();

            if (createError) {
              throw new Error(`Failed to create profile: ${createError.message}`);
            }

            profile = newProfile;
          } else {
            throw profileError;
          }
        } else {
          profile = profileData;
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!profile) {
      throw new Error('Failed to get or create user profile');
    }

    return profileToUser(profile);
  } catch (error) {
    console.error('SignIn error:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    // Get user profile with retry logic
    let profile;
    let retries = 3;
    
    while (retries > 0 && !profile) {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email!.split('@')[0],
                team: 'Personal',
              })
              .select('*')
              .single();

            if (createError) {
              console.error('Failed to create profile:', createError);
              return null;
            }

            profile = newProfile;
          } else {
            console.error('Error fetching profile:', error);
            return null;
          }
        } else {
          profile = profileData;
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('Failed to get profile after retries:', error);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!profile) {
      return null;
    }

    return profileToUser(profile);
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
};

export const updateProfile = async (updates: Partial<Omit<User, 'id'>>): Promise<User> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select('*')
    .single();

  if (error || !profile) {
    throw new Error('Failed to update profile');
  }

  return profileToUser(profile);
};

// Legacy functions for compatibility
export const login = signIn;
export const logout = signOut;