import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wifi, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

export function HueSetup() {
  const [bridgeIp, setBridgeIp] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [step, setStep] = useState<'input' | 'pairing' | 'success'>('input');
  const [username, setUsername] = useState('');
  const { toast } = useToast();

  const discoverBridge = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch('https://discovery.meethue.com');
      const bridges = await response.json();
      
      if (bridges.length > 0) {
        setBridgeIp(bridges[0].internalipaddress);
        toast({
          title: "Bridge Found",
          description: `Found Hue Bridge at ${bridges[0].internalipaddress}`,
        });
      } else {
        toast({
          title: "No Bridge Found",
          description: "Please enter your bridge IP manually",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Discovery Failed",
        description: "Please enter your bridge IP manually",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const startPairing = async () => {
    if (!bridgeIp) {
      toast({
        title: "Bridge IP Required",
        description: "Please enter your Hue Bridge IP address",
        variant: "destructive"
      });
      return;
    }

    setStep('pairing');
    
    // Start polling for button press
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const pollForUser = async () => {
      try {
        const response = await fetch(`http://${bridgeIp}/api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            devicetype: 'hue_temperature_widget#widget'
          })
        });

        const result = await response.json();
        
        if (result[0]?.success?.username) {
          const newUsername = result[0].success.username;
          setUsername(newUsername);
          
          // Save config to localStorage
          const config = {
            bridgeIp,
            username: newUsername
          };
          localStorage.setItem('hueConfig', JSON.stringify(config));
          
          setStep('success');
          return;
        }
        
        if (result[0]?.error?.type === 101) {
          // Button not pressed yet, continue polling
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(pollForUser, 1000);
          } else {
            setStep('input');
            toast({
              title: "Pairing Timeout",
              description: "Please try again and press the bridge button within 30 seconds",
              variant: "destructive"
            });
          }
        } else {
          throw new Error(result[0]?.error?.description || 'Unknown error');
        }
      } catch (error) {
        setStep('input');
        toast({
          title: "Connection Failed",
          description: "Failed to connect to Hue Bridge. Check your IP address.",
          variant: "destructive"
        });
      }
    };

    pollForUser();
  };

  const completePairing = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-dusk flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/90 backdrop-blur-sm border-0 shadow-2xl">
        <div className="text-center mb-8">
          <Wifi className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Setup Hue Bridge</h1>
          <p className="text-muted-foreground">
            Connect to your Philips Hue Bridge to display outdoor temperature
          </p>
        </div>

        {step === 'input' && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="bridgeIp">Bridge IP Address</Label>
              <Input
                id="bridgeIp"
                placeholder="192.168.1.xxx"
                value={bridgeIp}
                onChange={(e) => setBridgeIp(e.target.value)}
              />
            </div>

            <Button 
              onClick={discoverBridge}
              disabled={isConnecting}
              variant="outline"
              className="w-full"
            >
              {isConnecting ? 'Searching...' : 'Auto-discover Bridge'}
            </Button>

            <Button 
              onClick={startPairing}
              disabled={!bridgeIp}
              className="w-full"
            >
              Connect to Bridge
            </Button>

            <Button 
              variant="ghost" 
              onClick={() => window.location.href = '/'}
              className="w-full text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        )}

        {step === 'pairing' && (
          <div className="text-center space-y-6">
            <AlertCircle className="w-16 h-16 mx-auto text-primary animate-pulse" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Press Bridge Button</h3>
              <p className="text-muted-foreground">
                Press the large button on top of your Hue Bridge now. You have 30 seconds to complete this step.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Waiting for button press...
              </p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Connected Successfully!</h3>
              <p className="text-muted-foreground">
                Your Hue Bridge is now connected. The app will automatically fetch temperature data from your outdoor motion sensor.
              </p>
            </div>
            <Button onClick={completePairing} className="w-full">
              Start Using Widget
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}