import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Shield, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Login() {
  const { login, verifyOtp, isLoading, currentStep, pendingPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format (09xxxxxxxxx - 10 digits starting with 09)
    const phoneRegex = /^09\d{8}$/;
    if (!phoneRegex.test(phone)) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (starts with 09 and 10 digits total)",
        variant: "destructive",
      });
      return;
    }

    const success = await login(phone);
    if (success) {
      toast({
        title: "Success",
        description: "OTP sent to your phone number",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      });
      return;
    }

    const success = await verifyOtp(pendingPhone, otp);
    if (success) {
      toast({
        title: "Success",
        description: "Login successful!",
      });
    } else {
      toast({
        title: "Error",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBackToPhone = () => {
    setOtp('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {currentStep === 'phone' ? (
              <Phone className="w-8 h-8 text-primary" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {currentStep === 'phone' ? 'Welcome Back' : 'Verify OTP'}
          </CardTitle>
          <p className="text-muted-foreground">
            {currentStep === 'phone' 
              ? 'Enter your phone number to continue'
              : `Enter the verification code sent to ${pendingPhone}`
            }
          </p>
        </CardHeader>

        <CardContent>
          {currentStep === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="09xxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-center text-lg"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter your phone number starting with 09 (10 digits total)
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 4-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackToPhone}
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Phone Number
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Didn't receive the code?{' '}
                <Button
                  type="button"
                  variant="link"
                  className="p-0 h-auto font-normal"
                  onClick={() => login(pendingPhone)}
                  disabled={isLoading}
                >
                  Resend OTP
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 