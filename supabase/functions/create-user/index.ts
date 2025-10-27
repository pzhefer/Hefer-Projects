import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateUserRequest {
  email: string;
  full_name: string;
  job_title?: string;
  department?: string;
  redirect_url?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_administrator', {
      user_id: user.id
    });

    if (!isAdmin) {
      throw new Error('Only administrators can create users');
    }

    const { email, full_name, job_title, department, redirect_url }: CreateUserRequest = await req.json();

    if (!email || !full_name) {
      throw new Error('Email and full name are required');
    }

    const temporaryPassword = generateTemporaryPassword();

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: false,
      user_metadata: {
        full_name: full_name,
      }
    });

    if (createError) throw createError;

    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        full_name: full_name,
        job_title: job_title || '',
        department: department || '',
        is_active: true
      })
      .eq('id', newUser.user.id);

    if (profileError) throw profileError;

    const redirectUrl = redirect_url || `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify`;

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name,
        job_title: job_title || '',
        department: department || '',
      },
      redirectTo: redirectUrl
    });

    if (inviteError) {
      console.error('Error sending invite:', inviteError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created and invitation sent',
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name: full_name
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create user' 
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function generateTemporaryPassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
