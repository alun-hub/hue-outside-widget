import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Thermometer, Wifi, WifiOff, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemperatureData {
  temperature: number;
  lastUpdated: Date;
  sensorName: string;
}

interface HueConfig {
  bridgeIp: string;
  username: string;
}

export function TemperatureWidget() {
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<HueConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('hueConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  useEffect(() => {
    if (config) {
      fetchTemperature();
      const interval = setInterval(fetchTemperature, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [config]);

  const fetchTemperature = async () => {
    if (!config) return;

    setIsLoading(true);
    try {
      // Philips Hue API call to get sensors
      const response = await fetch(`http://${config.bridgeIp}/api/${config.username}/sensors`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sensors');
      }

      const sensors = await response.json();
      
      // Find outdoor motion sensor with temperature capability
      const temperatureSensor = Object.values(sensors).find((sensor: any) => 
        sensor.type === 'ZLLTemperature' && 
        sensor.name.toLowerCase().includes('outdoor')
      ) as any;

      if (temperatureSensor && temperatureSensor.state.temperature !== null) {
        const tempCelsius = temperatureSensor.state.temperature / 100; // Hue returns temperature * 100
        
        setTemperatureData({
          temperature: tempCelsius,
          lastUpdated: new Date(),
          sensorName: temperatureSensor.name
        });
        setIsConnected(true);
      } else {
        throw new Error('No outdoor temperature sensor found');
      }
    } catch (error) {
      console.error('Failed to fetch temperature:', error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to fetch temperature from Hue sensor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp <= 10) return 'text-temperature-cool';
    if (temp >= 25) return 'text-temperature-warm';
    return 'text-temperature-neutral';
  };

  const getBackgroundGradient = (temp: number) => {
    if (temp <= 10) return 'bg-gradient-cool';
    if (temp >= 25) return 'bg-gradient-warm';
    return 'bg-gradient-dawn';
  };

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-dusk flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center bg-card/90 backdrop-blur-sm">
          <Settings className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">Setup Required</h2>
          <p className="text-muted-foreground mb-6">
            Connect to your Philips Hue Bridge to display outdoor temperature
          </p>
          <Button 
            onClick={() => window.location.href = '/setup'}
            className="w-full"
          >
            Setup Hue Bridge
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${temperatureData ? getBackgroundGradient(temperatureData.temperature) : 'bg-gradient-dusk'} flex items-center justify-center p-4 transition-all duration-1000`}>
      <Card className="w-full max-w-md p-8 text-center bg-card/90 backdrop-blur-sm border-0 shadow-2xl">
        {/* Connection Status */}
        <div className="flex items-center justify-center mb-6">
          {isConnected ? (
            <Wifi className="w-5 h-5 text-primary mr-2" />
          ) : (
            <WifiOff className="w-5 h-5 text-destructive mr-2" />
          )}
          <span className={`text-sm ${isConnected ? 'text-primary' : 'text-destructive'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Temperature Display */}
        <div className="mb-8">
          <Thermometer className={`w-16 h-16 mx-auto mb-4 ${temperatureData ? getTemperatureColor(temperatureData.temperature) : 'text-muted-foreground'}`} />
          
          {temperatureData ? (
            <>
              <div className={`text-6xl font-bold mb-2 ${getTemperatureColor(temperatureData.temperature)}`}>
                {Math.round(temperatureData.temperature)}°
              </div>
              <div className="text-lg text-muted-foreground mb-2">
                {temperatureData.sensorName}
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {temperatureData.lastUpdated.toLocaleTimeString()}
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold mb-2 text-muted-foreground">--°</div>
              <div className="text-lg text-muted-foreground">
                {isLoading ? 'Loading...' : 'No data'}
              </div>
            </>
          )}
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={fetchTemperature}
          disabled={isLoading || !config}
          variant="outline"
          className="w-full"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>

        {/* Settings Link */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => window.location.href = '/setup'}
          className="mt-4 text-muted-foreground"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </Card>
    </div>
  );
}