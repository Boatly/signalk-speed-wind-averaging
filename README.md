# signalk-speed-wind-averaging
SignalK plugin to calculate average boat speed and wind speed over a defined period.  The plugin receives boat speed and wind speed deltas every seconds and calculates running averages from that data.

The plugin calculates the following values:

- Maximum boat speed
- Maximum boat speed over the last 10 seconds
- Running average boat speed (all time average)
- The boat speed averaged over the last 10 seconds
- The maximum average 10 second boat

- Maximum wind speed
- Maximum wind speed over the last 10 seconds
- Running average wind speed (all time average)
- The wind speed averaged over the last 10 seconds
- The maximum average 10 second wind speed

All values are calculated as m/s.

The following properties can be set in the plugin's configuration screen:

- The period over which to average (10 seconds by default)
- The SignalK paths from which to read the current boat speed and wind speed
- The SignalK paths which are written to with the calculated values

To reset the running averages for boat speed and wind speed you can call the following handler:

`http://<signalk-server>/signalk/v1/api/reset-signalk-speed-wind-averaging`
