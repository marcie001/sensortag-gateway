'use strict';

var SensorTag = require('sensortag');
var Rx = require('rx');
var Async = require('async');
var period = 2500;

var logError = error => {
    if (error) console.log(error)
};

var discoverCallback = sensorTag => {
    console.log(`${sensorTag.id} discovered`);
    sensorTag.on('disconnect', () => {
        console.log('disconnected!');
        process.exit(0);
    });

    Async.series([
        callback => {
            console.log('connectAndSetUp');
            sensorTag.connectAndSetUp(callback);
        },
        callback => {
            console.log('enableHumidity');
            sensorTag.enableHumidity(callback);
        },
        callback => {
            console.log('enableBarometricPressure');
            sensorTag.enableBarometricPressure(callback);
        },
        callback => {
            console.log('enableLuxometer');
            sensorTag.enableLuxometer(callback);
        },
        callback => {
            setTimeout(callback, 2000);
        },
        callback => {
            Rx.Observable.zip(
                Rx.Observable.create(observer => {
                    sensorTag.on('humidityChange', (temperature, humidity) => {
                        observer.onNext(temperature);
                    });
                }),
                Rx.Observable.create(observer => {
                    sensorTag.on('humidityChange', (temperature, humidity) => {
                        observer.onNext(humidity);
                    });
                }),
                Rx.Observable.create(observer => {
                    sensorTag.on('barometricPressureChange', pressure => {
                        observer.onNext(pressure);
                    });
                }),
                Rx.Observable.create(observer => {
                    sensorTag.on('luxometerChange', lux => {
                        observer.onNext(lux);
                    });
                }),
                (temperature, humidity, pressure, lux) => {
                    return {
                        temperature: temperature,
                        humidity: humidity,
                        pressure: pressure,
                        lux: lux
                    };
                }
            ).map(x => {
                return {
                    temperature: x.temperature.toFixed(1) + '℃',
                    humidity: x.humidity.toFixed(1) + '%',
                    pressure: x.pressure.toFixed(1) + 'mBar',
                    lux: x.lux.toFixed(1)
                };
            }).subscribe(
                x => {
                    x.id = sensorTag.id;
                    console.log(x);
                },
                logError,
                () => console.log('complete')
            );

            sensorTag.setHumidityPeriod(period, error => {
                logError(error);
                sensorTag.notifyHumidity(logError);
            });
            sensorTag.setBarometricPressurePeriod(period, error => {
                logError(error);
                sensorTag.notifyBarometricPressure(logError);
            });
            sensorTag.setLuxometerPeriod(period, error => {
                logError(error);
                sensorTag.notifyLuxometer(logError);
            });
            
            callback();
        }
    ]);
};

SensorTag.discoverAll(discoverCallback);
