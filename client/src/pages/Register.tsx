import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Lock, Mail, UserPlus, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

const registerFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must not exceed 80 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerFormSchema>

export const Register: React.FC = () => {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await registerUser(data.name, data.email, data.password)
      navigate('/')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(
        err.response?.data?.message || 'Failed to create account. Email may already be in use.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 animate-pulse" />

      <Card className="max-w-md w-full border-slate-800 bg-slate-900/60 backdrop-blur-lg shadow-2xl relative">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <UserPlus className="text-slate-950 size-5" />
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            Create Account
          </CardTitle>
          <CardDescription className="text-slate-400">
            Register as a citizen to easily report issues and track resolutions.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-start gap-2 animate-shake">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-10 bg-slate-950/50 border-slate-800 focus:border-teal-500/60 text-slate-100"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 bg-slate-950/50 border-slate-800 focus:border-teal-500/60 text-slate-100"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-slate-950/50 border-slate-800 focus:border-teal-500/60 text-slate-100"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 size-4" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 bg-slate-950/50 border-slate-800 focus:border-teal-500/60 text-slate-100"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold py-2 rounded-lg transition duration-200 mt-2 shadow-lg shadow-teal-900/20"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-teal-400 hover:text-teal-300 font-medium underline underline-offset-4"
            >
              Sign in instead
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
