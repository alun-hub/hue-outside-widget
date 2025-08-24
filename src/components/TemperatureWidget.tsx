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
    <div className={`min-h-screen ${temperatureData ? getBackgroundGradient(temperatureData.temperature) : 'bg-gradient-dusk'} flex flex-col items-center justify-center p-2 transition-all duration-1000`}>
      {/* Minimal Screen Widget Layout */}
      <div className="w-full max-w-sm text-center">
        {/* Connection indicator */}
        <div className="flex items-center justify-center mb-4">
          {isConnected ? (
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-2" />
          ) : (
            <div className="w-2 h-2 bg-destructive rounded-full mr-2" />
          )}
          <span className="text-xs opacity-60">
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Main temperature display */}
        {temperatureData ? (
          <div className="mb-6">
            <div className={`text-8xl md:text-9xl font-thin mb-2 ${getTemperatureColor(temperatureData.temperature)} drop-shadow-lg`}>
              {Math.round(temperatureData.temperature)}°
            </div>
            <div className="text-base opacity-70 font-light">
              OUTDOOR
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="text-8xl md:text-9xl font-thin mb-2 text-muted-foreground drop-shadow-lg">
              --°
            </div>
            <div className="text-base opacity-70 font-light">
              {isLoading ? 'LOADING...' : 'NO DATA'}
            </div>
          </div>
        )}

        {/* Last update time */}
        {temperatureData && (
          <div className="text-xs opacity-50 mb-8">
            Updated {temperatureData.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        {/* Minimal controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button 
            onClick={fetchTemperature}
            disabled={isLoading || !config}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
          >
            <Thermometer className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.location.href = '/setup'}
            className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}