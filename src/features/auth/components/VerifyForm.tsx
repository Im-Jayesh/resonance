"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { verifyOtpAction } from "@/server/actions/auth.actions";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const verifySchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const emailFromQuery = searchParams.get("email") || "";

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
    },
  });

  useEffect(() => {
    if (emailFromQuery) {
      form.setValue("email", emailFromQuery);
    }
  }, [emailFromQuery, form]);

  async function onSubmit(data: VerifyFormValues) {
    setIsLoading(true);
    const result = await verifyOtpAction(data);
    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.success);
      router.push("/auth/login");
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto glass border-white/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
        <CardDescription className="text-center">
          Enter the 6-digit code sent to your email
        </CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              disabled={true}
              {...form.register("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              placeholder="123456"
              maxLength={6}
              disabled={isLoading}
              {...form.register("code")}
            />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Didn&apos;t receive a code?{" "}
            <Button variant="link" className="p-0 h-auto" type="button">
              Resend code
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
