import { combineWith } from 'baconjs'

const PLUGIN_ID = 'signalk-speed-wind-averaging'
const PLUGIN_NAME = 'Calculate boat & wind speed averages.'

interface IPlugin {
  start: (app: any) => void,
  stop: () => void,
  statusMessage: (msg: string) => void,
  signalKApiRoutes: (router: any) => void,
  started: boolean,
  id: string,
  name: string,
  description: string,
  schema: any
}

export default function (app: any) {

  let unsubscribe: () => void

  let startTime = 0

  let count = 0
  let periodCount = 0

  let avgSpeed = 0
  let avgSpeedOverPeriod = 0
  let maxAvgSpeedOverPeriod = 0

  let avgWind = 0
  let avgWindOverPeriod = 0
  let maxAvgWindOverPeriod = 0

  let avgPeriodWindDeltaPath = ''
  let maxAvgPeriodWindDeltaPath = ''
  let avgPeriodSpeedDeltaPath = ''
  let maxAvgPeriodSpeedDeltaPath = ''
  let avgWindDeltaPath = ''
  let avgSpeedDeltaPath = ''

  const plugin: IPlugin = {

    start: async function (props: any) {

      try {

        avgPeriodWindDeltaPath = props.avgPeriodWindDeltaPath
        maxAvgPeriodWindDeltaPath = props.maxAvgPeriodWindDeltaPath
        avgPeriodSpeedDeltaPath = props.avgPeriodSpeedDeltaPath
        maxAvgPeriodSpeedDeltaPath = props.maxAvgPeriodSpeedDeltaPath
        avgWindDeltaPath = props.avgWindDeltaPath
        avgSpeedDeltaPath = props.avgSpeedDeltaPath

        const speedStream = app.streambundle
          .getSelfStream(props.speedPath)

        const windStream = app.streambundle
          .getSelfStream(props.windSpeedPath)

        unsubscribe = combineWith<any, any>(function (sog: number, tws: number) {
          return formatData(sog, tws)
        }, [
          speedStream,
          windStream,
        ]
          .map((s: any) => s.toProperty(undefined)))
          .changes()
          .debounceImmediate((props.updaterate || 1) * 1000)
          .onValue((value: any) => {

            // Set start time on first value received in this period   
            if (periodCount === 0) {
              startTime = new Date().getTime()
            }

            count += 1
            periodCount += 1

            // Calculate averages
            updateAvgSpeed(value.speed)
            updateAvgWind(value.wind)

            updateSignalKAllTimePaths()

            const currentTime = new Date().getTime()

            const seconds = Math.round((currentTime - startTime) / 1000)

            // Send averages to Signal K and compute maximums once end of averaging period reached
            if (seconds >= (props.averagingPeriod - 1)) {

              // Update max average values if exceeded
              if (avgSpeedOverPeriod > maxAvgSpeedOverPeriod) {
                maxAvgSpeedOverPeriod = avgSpeedOverPeriod
              }

              if (avgWindOverPeriod > maxAvgWindOverPeriod) {
                maxAvgWindOverPeriod = avgWindOverPeriod
              }

              updateSignalKAveragePaths()              

              // Reset counter & averages
              periodCount = 0
              avgSpeedOverPeriod = 0
              avgWindOverPeriod = 0
            }

          })

      } catch (e) {
        plugin.started = false
        app.debug(e)
      }

    },

    // Unsubcribe from deltas when the plugin is stopped
    stop: function () {
      if (unsubscribe) {
        unsubscribe()
      }
    },

    statusMessage: function () {
      return `Started`
    },

    signalKApiRoutes: function (router) {

      router.post("/reset-signalk-speed-wind-averaging", (req: any, res: any) => {
        reset()
        res.send('ok')                
      })

      return router
    },

    started: false,
    id: PLUGIN_ID,
    name: PLUGIN_NAME,
    description: "Calculates average and maximum values for speed over ground (SOG) and true wind speed (TWS).",
    schema: {
      type: 'object',
      required: ['speedPath', 'windSpeedPath', 'averagingPeriod'],
      properties: {
        speedPath: {
          type: 'string',
          title: 'The path of the SignalK speed data to use.',
          default: 'navigation.speedOverGround',
          enum: ['navigation.speedOverGround', 'navigation.speedThroughWater', 'navigation.speedThroughWaterTransverse']
        },

        windSpeedPath: {
          type: 'string',
          title: 'The path of the SignalK wind speed data to use.',
          default: 'environment.wind.speedTrue',
          enum: ['environment.wind.speedTrue', 'environment.wind.speedOverGround', 'environment.wind.speedApparent']
        },

        averagingPeriod: {
          type: 'number',
          title: 'The period over which to average (seconds)',
          default: 20
        },

        avgWindDeltaPath: {
          type: 'string',
          title: 'The path to which the all time average wind speed is published.',
          default: 'environment.wind.speedAverage'
        },

        avgPeriodWindDeltaPath: {
          type: 'string',
          title: 'The path to which the average wind speed over the specificed averaging period will be published.',
          default: 'environment.wind.speedPeriodAverage'
        },

        maxAvgPeriodWindDeltaPath: {
          type: 'string',
          title: 'The path to which the maximum average wind speed over the specificed averaging period will be published.',
          default: 'environment.wind.speedMaxPeriodAverage'
        },

        avgSpeedDeltaPath: {
          type: 'string',
          title: 'The path to which the all time average boat speed is published.',
          default: 'navigation.speedAverage'
        },

        avgPeriodSpeedDeltaPath: {
          type: 'string',
          title: 'The path to which the average boat speed over the specificed averaging period will be published.',
          default: 'navigation.speedPeriodAverage'
        },

        maxAvgPeriodSpeedDeltaPath: {
          type: 'string',
          title: 'The path to which the maximum boat speed average over the specificed averaging period will be published.',
          default: 'navigation.speedMaxPeriodAverage'
        }
      }
    }
  }

  return plugin;

  function reset() {
    startTime = 0
    count = 0
    periodCount = 0
    avgSpeed = 0
    avgSpeedOverPeriod = 0
    maxAvgSpeedOverPeriod = 0
    avgWind = 0
    avgWindOverPeriod = 0
    maxAvgWindOverPeriod = 0

    updateSignalKAveragePaths()
    updateSignalKAllTimePaths()
  }

  function updateSignalKAveragePaths() {
    app.handleMessage('my-signalk-plugin', {
      updates: [
        {
          values: [
            { path: avgPeriodWindDeltaPath, value: avgWindOverPeriod },
            { path: maxAvgPeriodWindDeltaPath, value: maxAvgWindOverPeriod },
            { path: avgPeriodSpeedDeltaPath, value: avgSpeedOverPeriod },
            { path: maxAvgPeriodSpeedDeltaPath, value: maxAvgSpeedOverPeriod },
          ]
        }
      ]
    })
  }

  function updateSignalKAllTimePaths() {
    app.handleMessage('my-signalk-plugin', {
      updates: [
        {
          values: [
            { path: avgWindDeltaPath, value: avgWind },
            { path: avgSpeedDeltaPath, value: avgSpeed },
          ]
        }
      ]
    })    
  }

  function formatData(speed: any, wind: any) {
    return ({ speed: speed, wind: wind })
  }

  function updateAvgSpeed(newValue: number) {
    if (newValue) {
      avgSpeed = avgSpeed + (newValue - avgSpeed) / count
      avgSpeedOverPeriod = avgSpeedOverPeriod + (newValue - avgSpeedOverPeriod) / periodCount
    }
  }

  function updateAvgWind(newValue: number) {
    if (newValue) {
      avgWind = avgWind + (newValue - avgWind) / count
      avgWindOverPeriod = avgWindOverPeriod + (newValue - avgWindOverPeriod) / periodCount
    }
  }

}