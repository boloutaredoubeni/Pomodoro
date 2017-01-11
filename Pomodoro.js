/** @flow */
import React, { Component, PropTypes } from 'react'
import {
    AppState,
    AsyncStorage,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableHighlight, 
    TouchableOpacity,
    View
} from 'react-native'
import BackgroundTimer from 'react-native-background-timer'
import PushNotification from 'react-native-push-notification'
import _ from 'lodash'
import { fromJS, List, Map } from 'immutable'

// TODO: animate interactions
/** TODO: show a navbar with the state, put the settings and save button there */
/** TODO: make the timer prettier */
const IOS = _.isEqual(Platform.OS, 'ios')
const ANDROID = _.isEqual(Platform.OS, 'android')
const SECOND = 1000
const MINUTE = SECOND * 60
const HOUR = MINUTE * 60

const onNotification = (_notification) => {}

const PUSH_NOTIFICATION_CONFIGURATON = {
  onNotification
}

PushNotification.configure(PUSH_NOTIFICATION_CONFIGURATON)

const PauseButton = ({ stopTimer, resetTimer }) => {
  return (
    <TouchableOpacity onPress={stopTimer} onLongPress={resetTimer}>
      <View style={styles.button}>
        <View style={styles.pillar} />
        <View style={styles.pillar} />
      </View>
    </TouchableOpacity>
  )
}

const PlayButton = ({ startTimer, resetTimer }) => {
  return (
     <TouchableOpacity onPress={startTimer} onLongPress={resetTimer}>
      <View style={styles.button}>
        <View style={styles.playTriangle} />
      </View>
    </TouchableOpacity>
  )
}

const TimeDisplay = ({ hours, minutes, seconds, willShowUserPreferences }) => {
  return (
    <TouchableOpacity onLongPress={willShowUserPreferences}>
      <View>
        <Text style={styles.clock}>
          <Text>{minutes}</Text>
          <Text>:</Text>
          <Text>{seconds}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const TimeInput = ({ hours, minutes, seconds, saveMinutes, saveSeconds }) => {
  let m = `${minutes}`
  if (minutes < 10) {
    m = `0${minutes}`
  }

  let s = `${seconds}`
  if (seconds < 10) {
    s = `0${seconds}`
  }

  return (
    <View style={styles.timeInput}>
      <TextInput 
        autoCorrect={false} 
        style={styles.clockInput}
        keyboardType='numeric'
        maxLength={2} 
        returnKeyType='done'
        onChangeText={saveMinutes} />
      <Text style={styles.clock}>:</Text>
      <TextInput
        autoCorrect={false} 
        style={styles.clockInput}
        keyboardType='numeric'
        maxLength={2} 
        returnKeyType='done'
        onChangeText={saveSeconds} />
    </View>
  )
}

class UserPreferences extends Component {

  static propTypes = {
    breaktime: PropTypes.number.isRequired,
    worktime: PropTypes.number.isRequired,
    setUserPreferences: PropTypes.func.isRequired,
    parseTime: PropTypes.func.isRequired,
    receiveError: PropTypes.func.isRequired,
  }
  
  constructor(props) {
    super(props)
    const { breaktime, worktime } = props
    var { minutes, seconds } = props.parseTime(breaktime)
    var userbreakMinutes = minutes
    var userbreakSeconds = seconds

    var { minutes, seconds } = props.parseTime(worktime)
    var userworkMinutes = minutes
    var userworkSeconds = seconds

    this.state = {
      breaktime,
      worktime,
      userbreakMinutes,
      userbreakSeconds,
      userworkMinutes,
      userworkSeconds,
    }
  }

  render () {
    /** TODO: handle user interaction */
     const { 
        userworkMinutes, 
        userworkSeconds, 
        userbreakMinutes, 
        userbreakSeconds 
    } = this.state
    return (
      <View>
        <Text style={styles.formText}>Worktime</Text>
        <TimeInput 
          minutes={userworkMinutes} 
          seconds={userworkSeconds}
          saveMinutes={this._updateWorkMinutes}
          saveSeconds={this._updateWorkSeconds} />
        <Text style={styles.formText}>Breaktime</Text>
        <TimeInput 
          minutes={userbreakMinutes} 
          seconds={userbreakSeconds}
          saveMinutes={this._updateBreakMinutes}
          saveSeconds={this._updateBreakSeconds} />
        <View style={styles.formFooter}>
          <TouchableOpacity style={styles.formButton} onPress={this._setUserPreferences}>
            <Text style={styles.formText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  _setUserPreferences = () => {
    try {
      const { 
        breaktime, 
        worktime, 
        userworkMinutes, 
        userworkSeconds, 
        userbreakMinutes, 
        userbreakSeconds 
      } = this.state
      console.error(JSON.stringify(this.state))
      var userwork = 0
      var { minutes, seconds } = this.props.parseTime(worktime)
      var m = userworkMinutes * MINUTE
      if (!_.isEqual(minutes, m)) {
        userwork += m
      }

      var s = userworkSeconds * SECOND
      if (!_.isEqual(minutes, s)) {
        userwork += s
      }

      var userbreak = 0
      var { minutes, seconds } = this.props.parseTime(breaktime)
      var m = userbreakMinutes * MINUTE
      if (!_.isEqual(minutes, m)) {
        userbreak += m
      }

      var s = userbreakSeconds * SECOND
      if (!_.isEqual(minutes, s)) {
        userbreak += s
      }

      this.props.setUserPreferences(userwork, userbreak)
    } catch(error) {
      this.props.receiveError(error)
    }
  }

  _updateWorkMinutes = (minutes) => {
    let userworkMinutes = new Number(minutes)
    if (_.isNumber(userworkMinutes && userworkMinutes >= 0)) {
      this.setState({
        userworkMinutes
      })
    } 
  }

  _updateWorkSeconds = (seconds) => {
    let userworkSeconds = new Number(seconds)
    if (_.isNumber(userworkSeconds && userworkSeconds >= 0)) {
      this.setState({
        userworkSeconds
      })
    } 
  }

  _updateBreakMinutes = (minutes) => {
    let userbreakMinutes = new Number(minutes)
    if (_.isNumber(userbreakMinutes && userbreakMinutes >= 0)) {
      this.setState({
        userbreakMinutes
      })
    } 
  }

  _updateBreakSeconds = (seconds) => {
    let userbreakSeconds = new Number(seconds)
    if (_.isNumber(userbreakSeconds && userbreakSeconds >= 0)) {
      this.setState({
        userbreakSeconds
      })
    } 
  }
}

export default class Pomodoro extends Component {
  
  constructor(props) {
    super(props);
    
    this.TIMER_ID = 0
    this.PLAYING = 'playing'
    this.PAUSED = 'paused'
    this.RESET = 'reset'
    this.APP_STATE_ID = 'change'
    this.STORAGE_KEY = {
      worktimeKey: 'worktime',
      breaktimeKey: 'breaktime',
    }
    var defaultWorkTime = MINUTE * 25
    var defaultBreakTime = MINUTE * 5
    this.state = {
      errors: List.of([]),
      showUserPreferences: false,
      worktime: defaultWorkTime,
      breaktime: defaultBreakTime,
      timer: this.PAUSED,
      timeOnClock: defaultWorkTime, 
      onBreak: false,
      backgroundColor: '#f53229',
      appState: AppState.currentState
    }
  }

  componentDidMount() {
    AppState.addEventListener(this.APP_STATE_ID, this._handleAppStateChange)
    this._configureTimer()
    // this._loadUserPreferences()
  }

  componentWillUnmount() {
    AppState.removeEventListener(this.APP_STATE_ID, this._handleAppStateChange)
    BackgroundTimer.clearInterval(this.TIMER_ID);
  }

  render() {
    let { backgroundColor } = this.state
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {this._renderDisplay()}
        <View style={styles.containerSpace} />
        <View style={styles.timerButton}>
          {this._renderButton()}
        </View>
      </View>
    )
  }

  _renderButton() {
    switch (this.state.timer) {
    case this.PLAYING:
      return <PauseButton stopTimer={this._stopTimer} resetTimer={this._resetTimer}/>
    case this.PAUSED:
      return <PlayButton startTimer={this._startTimer} resetTimer={this._resetTimer}/>
    default:
      return <View />
    }
  }

  _renderDisplay() {
    const { timeOnClock, showUserPreferences, worktime, breaktime } = this.state
    const { hours, minutes, seconds } = this._parseTime(timeOnClock)
    return (
      <View>
        <TimeDisplay 
          hours={hours} 
          minutes={minutes} 
          seconds={seconds} 
          willShowUserPreferences={() => {
            if (!showUserPreferences) {
               this.setState({ 
                showUserPreferences: true 
              })
            }
          }} />
        {
          showUserPreferences &&
          <UserPreferences 
            parseTime={this._parseTime}
            worktime={worktime}
            breaktime={breaktime}
            setUserPreferences={this._setUserPreferences}
            receiveError={this._receiveError}
          />
        }
      </View>
    )
  }

  _receiveError = (error) => {
    let { errors } = this.state
    console.error(error)
    errors = errors.shift(error)
    this.setState({
      errors
    })
  }

  _parseTime = (timeToDisplay) => {
    const ms = new Number(timeToDisplay)
    if (!_.isNumber(ms)) {
      console.error(NaN)
      return {
        mintues: -1,
        seconds: -1
      }
    }
    const date = new Date(ms)
    const m = date.getMinutes()
    const s = date.getSeconds()

    let minutes = `${m}`
    if (m < 10) {
      minutes = `0${m}`
    }

    let seconds = `${s}`
    if (s < 10) {
        seconds = `0${s}`
    }

    return {
      minutes,
      seconds
    }
  }

  _configureTimer = () => {
    this.TIMER_ID = BackgroundTimer.setInterval(() => {
      let { 
        timeOnClock ,
        timer, 
        onBreak, 
        backgroundColor, 
        appState,
        worktime,
        breaktime
      } = this.state
      if (_.isEqual(timer, this.PLAYING)) {

        let nexttime = timeOnClock - SECOND;
        const timerState = (() => {
          if (nexttime < 0) {
            timer = this.PAUSED
            nexttime = onBreak ? worktime : breaktime
            onBreak = !onBreak
            backgroundColor = onBreak ? '#228b22' : '#f53229'
            if (!_.isEqual(appState, 'active')) {
              let details = {
                message:  onBreak ? 'Break Time' : 'Get to Work',
                playSound: true
              }
              PushNotification.localNotification(details)
            }
          }
          return timer
        })()
        
        this.setState({
          timeOnClock: nexttime,
          timer: timerState,
          onBreak,
          backgroundColor
        })
      }
    }, SECOND)
  }

  _startTimer = () => {
    this.setState({
      timer: this.PLAYING
    })
  }

  _stopTimer = () => {
    this.setState({
      timer: this.PAUSED
    })
  }

  _resetTimer = () => {
    const { onBreak, breakTime, workTime } = this.state
    const timeOnClock = onBreak ? breakTime : workTime
    this.setState({
      timeOnClock,
      timer: this.PAUSED 
    })
  }

  _handleAppStateChange = (appState) => {
    this.setState({
      appState
    })
  }

  /** TODO: make the promise */
  _setUserPreferences = async (worktime, breaktime) => {
    const { worktimeKey, breaktimeKey } = this.STORAGE_KEY
    let { onBreak, timer, timeOnClock } = this.state
    try {
      // let worktimeValue = JSON.stringify(worktime)
      // await AsyncStorage.setItem(worktimeKey, worktimeValue)

      // let breaktimeValue = JSON.stringify(breaktime)
      // await AsyncStorage.setItem(breaktimeKey, breaktimeValue)
      // if (_.isEqual(timer, this.PAUSED)) {
      //   timeOnClock = onBreak ? breaktime : worktime
      // }

      // this.setState({
      //   timeOnClock,
      //   worktime,
      //   breaktime,
      //   showUserPreferences: false,
      // })
    } catch (error) {
      /** TODO: show error to client */
      this._receiveError(error)
    }
  }

  _loadUserPreferences = async () => {
    const { worktimeKey, breaktimeKey } = this.STORAGE_KEY
    try {
      let nextState = {}
      const worktimeValue = await AsyncStorage.getItem(worktimeKey)
      if (!_.isNil(worktimeValue)) {
        const worktime = JSON.parse(worktimeValue)
        nextState = {
          ...nextState,
          worktime
        }
      }
      
      const breaktimeValue = await AsyncStorage.getItem(breaktimeKey)
      if (!_.isNil(breaktimeValue)) {
        const breaktime = JSON.parse(breaktimeValue)
        nextState = {
          ...nextState,
          breaktime
        }
      }

      this.setState(nextState)
    } catch (error) {
       /** TODO: show error to client */
      this._receiveError(error)
    }
  }
}

/** TODO: refactor, consolidate */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  containerSpace: {
    height: 100
  },
  clock: {
    fontSize: 60,
    textAlign: 'center',
    paddingLeft: 5,
    paddingRight: 5,
    margin: 10,
    color: '#ecf0f1' // cloud
  },
  clockInput: {
    borderWidth: 0.5,
    borderColor: '#ecf0f1',
    borderRadius: 5,
    alignItems: 'center',
    textAlign: 'center',
    fontSize: 45,
    flex: 1,
    margin: 5,
    color: '#ecf0f1' // cloud
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timerButton: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderWidth: 0.5,
    borderColor: '#ecf0f1', // cloud
  },
  formText: {
    color: '#ecf0f1' // cloud
  },
  formButton: {
    padding: 5,
    borderColor: '#ecf0f1',
    borderWidth: 0.5,
    borderRadius: 2,
  },
  formFooter: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    margin: 5,
    padding: 5,
    flexDirection: 'row'
  },
  pillar: {
    height: 40,
    width: 10,
    backgroundColor: '#ecf0f1',
    margin: 10,
    padding: 5,
    borderRadius: 10
  },
  button: {
    flexDirection: 'row'
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderBottomWidth: 15,
    borderBottomColor: 'transparent',
    borderTopWidth: 15,
    borderTopColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
    borderLeftWidth: 30,
    borderLeftColor: '#ecf0f1',
    margin: 15,
    marginLeft: 20,
    borderRadius: 2
  },
  resetCircle: {
    height: 30,
    width: 30,
    borderRadius: 15,
    borderColor: '#43464b',
    borderWidth: 5,
    borderTopWidth: 0,
    margin: 10,
    marginLeft: 15,
    marginTop: 15
  },
  resetTriangle: {
    width: 0,
    height: 0,
    borderBottomWidth: 8,
    borderBottomColor: 'transparent',
    borderTopWidth: 8,
    borderTopColor: 'transparent',
    borderRightWidth: 0,
    borderRightColor: 'transparent',
    borderLeftWidth: 16,
    borderLeftColor: '#43464b',
    margin: 10,
    marginLeft: 5,
    marginTop: 0,
    paddingTop: 5,
    borderRadius: 2
  }
});