# Stonkam CMS Server API

 from http://183.233.190.23:6061/CmsApi/#/. The documentation bundle identifies itself as **Interface Development Documentation v1.9**, updated **2025-05-27**.

This reference is generated from the Vue documentation chunks served by the CMS API site. It is intended for IRYS CAS integration work.

## Base Services

| Service | Default port | Notes |
|---|---:|---|
| REST API | 6060 | Login, device list, GPS, alarms, config commands, record lookup. |
| File/docs host | 6061 | Documentation, demo downloads, server-side record download PHP endpoint. |
| Config status | 6062 | Some docs show DVR status/config reads on this port. |
| Realtime stream | 8082 | FLV live stream and voice intercom WebSocket. |
| Playback/download | 8083 | Playback and device-file download examples. |

## Authentication

Most API calls require a `SessionId` from login.

```bash
curl -X POST http://183.233.190.23:6060/RecordDataAuthentication/100 \
  -H 'Content-Type: application/json' \
  -d '{"UserName":"YOUR_USER","Password":"YOUR_PASSWORD","AuthType":1}'
```

Login response fields documented by Stonkam:

| Field | Type | Meaning |
|---|---|---|
| `UserName` | String | Returned username. |
| `SessionId` | Long long | Session value used by later requests. |
| `UserType` | Integer | Operator/user level. |
| `Result` | Boolean | Login success or failure. |
| `Reason` | String | Human-readable reason. |

## Endpoint Inventory

### Add device

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| AddGroup | POST | 6060 | `/AddGroup/100` | GroupName (Required), SessionId (Required), UserName (Required), Result, Reason |
| AddUser | POST | 6060 | `/AddUser/100` | UserName (Required), Password (Required), SessionId (Required), ParentUserName (Required), Result, Reason |
| AddDeviceForUser | POST | 6060 | `/AddDeviceForUser/100` | ParentUserName (Required), UserName (Required), DeviceId (Required), SessionId (Required), Result, Reason |
| AddDeviceForGroup | POST | 6060 | `/AddDeviceForGroup/100` | GroupName (Required), SessionId (Required), UserName (Required), DeviceId (Required), PlateNumber (Required), DeviceType (Required), ChannelNumber (Required), Result |

### Alarm management

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| GetDevicesRealtimeAlarm | WS/HTML demo | 6060 | `hostname` | DataType, UserName, EventId, DeviceId, DriverId, Type, TimeZone, SensorValue |
| GetDevicesAlarm | POST | 6060 | `/GetDevicesAlarm/100` | IsNeedPush, SessionId, UserName, DeviceId, DriverId, AlarmType, EventId, VideoId |
| query upload status of event record | GET | 6060 | `/QueryEventRecordStatus/100` | EventId, UserName, SessionId, UploadStatus, Reason |
| GetAlarmHistory | GET | 6060 | `/GetAlarmHistoryData/100` | DeviceId, AlarmType, BeginTime, EndTime, UserName, SessionId, AlarmHistoryDataNumber, AlarmHisotryData |

### Clip file

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| OfflineClip | POST | 6060 | `/OfflineInformDevice/100` | UserName, SessionId, InformType, DeviceList, DeviceId, Content, BeginTime, EndTime |
| SetUpload Video Time | POST | 6060 | `/SetUploadVideoTime/100` | UserName, SessionId, BeginTime, EndTime, DeviceId, Result, ErrorCode, Reason |

### Device information

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| Get Config | GET | 6062 | `/GetConfig/{deviceId}` | type (Required), UserName (Required), SessionId (Required), Time, Storage, TotalBytes, FreeBytes, Wifi |
| Get Device List | GET | 6060 | `/GetDeviceList/100` | UserName, SessionId, Number, TimeZone, Domain, DeviceList, DeviceId, PlateNumber |
| GetDVRLog | GET | 6060 | `/GetDeviceLogInfo/100` | SessionId, DeviceId, LogLevel, BeginTime, EndTime, LogInfoNumber, LogInfoList, ct |
| GetDeviceOnlineOfflineLog | GET | 6060 | `/GetDeviceOnlineOfflineLog/100` | DeviceId, BeginTime, EndTime, User, UtcFlag, SessionId, TimeZone, DeviceOnlineOfflineLogNumber |
| GetDevicesLastState | GET | 6060 | `/GetDevicesLastState/100` | DeviceId, UserName, SessionId, Lon, Lat, Cr, Speed, GpsTime |

### File

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| get record file list from event ID | GET | 6060 | `/GetRecordFromAlarmId/100` | DeviceId, EventId, UserName, SessionId |
| online playback of server | GET | 8083 | `/PlayBackOnline/FileName` | seek, filepath |
| get record file list from alarm ID | GET | 6060 | `/GetRecordFromAlarmId/100` | DeviceId, AlarmId, UserName, SessionId |
| get record file list of dvr | /GetDeviceFileList/DeviceId?FileType=X&ChannelIdMask=X&BeginTime=YYYY~MONTH~DAY~HOUR~MINITUE~SECOND&EndTime=YYYY~MONTH~DAY~HOUR~MINITUE~SECOND&SessionId=XXXX&User=xxxxxx | 6060 | `/GetDeviceFileList/DeviceID` | DeviceId, FileType, ChannelIdMask, BeginTime(UTC), EndTime(UTC), UserName, SessionId |
| DownloadRecordFile | GET | 6061 | `/DownloadRecordFile.php/100` | FileId, User, GlobalSessionId |
| get log or record of dvr | GET | 6060 | `/DownloadDeviceFile/FileName` | DeviceId, FileOffset, FileType, UserName, SessionId |
| GetRecordFileList | GET | 6060 | `/GetRecordFileList/100` | DeviceId, BeginTime(UTC), EndTime(UTC), User, SessionId, RecordFileListNumber, RecotdFileList, FileId |

### Image capture

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| GETDVRSnapshotimage | GET | 6060 | `/SnapPicture/(DeviceId)` | ChannelId, PictureType, PictureQuality, SnapTime, UserName, SessionId |

### Location and tracking

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| GetCurrentGPSInfo | POST | 6060 | `/GetDevicesGps/100` | UserName, SessionId, DeviceList, DeviceId, DevicesGps, Longitude, Latitude, Speed |
| GetDevicesRealtimeGPS | WS/HTML demo | 6060 | `hostname` | DataType, UserName, DeviceId, Longitude, Latitude, CarSpeed, Course, CurTime |
| GetVehicle'sGPShistory | GET | 6060 | `/GetGpsHistoryTrack/100` | DeviceId, BeginTime, EndTime, UserName, SessionId, GpsHistoryTrackNumber, GpsHisotryTrackInfo, tm |

### Login

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| Login | POST | 6060 | `/RecordDataAuthentication/100` | UserName, Password, AuthType, SessionId, UserType, Result, Reason |

### Other

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| online playback of device | GET | 8083 | `/PlaybackDevice/FileName` | DeviceId, TimeOffset, UserName, SessionId |

### Parameter config

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| SetOfflineConfigInfoForDevices | POST | 6060 | `/SetOfflineConfigInfoForDevices/100` | UserName, SessionId |
| GetOfflineConfigInfo | GET | 6060 | `/GetOfflineConfigInfo/100` | DeviceId, UserName, ConfigSrc, SessionId |
| GetDVRParameter | GET | 6060 | `/GetConfig/(DeviceID)` | Type, UserName, SessionId, Version, Record, RecordInfo, PowerOnRec, CyclicRec |
| FormatDvrSD | POST | 6060 | `/RemoteOperate/(DeviceId)` |  |
| SetDVRParameter | POST | 6060 | `/SetConfig/(DeviceId)` | UserName, SessionId, Record, RecordInfo, PowerOnRec, CyclicRec, PreRecTime, AlarmRec |
| RebootDvr | POST | 6060 | `/RemoteOperate/(DeviceId)` |  |

### Realtime stream

| Function | Method | Port | Path | Main parameters |
|---|---|---:|---|---|
| get realtime video of dvr | GET | 8082 | `/OpenDeviceStream/100` | DeviceId, ChannelId, RealTime, UserName, SessionId |
| voice Intercom | ws | 8082 | `/VoiceIntercom/100` | DeviceId, AudioType, SampleRate, UserName, SessionId |

## Common Request Examples

### Get Config

`https://183.233.190.23:6062/GetConfig/2110090025?type=DvrStatus&UserName=555555&SessionId=170410`

### Get Device List

`http://183.233.190.23:6060/GetDeviceList/100?UserName=DEMO&SessionId=139743`

### AddGroup

`http://183.233.190.23:6060/AddGroup/100?`

### Login

`http://183.233.190.23:6060/RecordDataAuthentication/100`

### AddUser

`http://183.233.190.23:6060/AddUser/100?`

### AddDeviceForUser

`http://183.233.190.23:6060/AddDeviceForUser/100?`

### AddDeviceForGroup

`http://183.233.190.23:6060/AddDeviceForGroup/100?`

### SetOfflineConfigInfoForDevices

`http://183.233.190.23:6060/SetOfflineConfigInfoForDevices/100?SessionId=903&UserName=DEMO`

### get realtime video of dvr

`http://183.233.190.23:6061/software/424/VideoflvDemo.zip`

`http://183.233.190.23:6061/software/424/VideoFlvDemo(support_ios).zip`

### get record file list from event ID

`http://183.233.190.23:6060/GetRecordFromAlarmId/100?UserName=555555&DeviceId=2110090007&EventId=20230918092517&SessionId=`

### online playback of server

`http://183.233.190.23:6061/software/424/PlaybackFromServerByFlvDEMO.zip`

### GetDVRLog

`http://183.233.190.23:6060/GetDeviceLogInfo/100?SessionId=71250&DeviceId=2107220013&LogLevel=0&BeginTime=2022~03~15~16~00~00&EndTime=2022~03~16~15~59~59`

### OfflineClip

`http://183.233.190.23:6060/OfflineInformDevice/100?SessionId=3921&UserName=DEMO`

### GetDVRParameter

`http://183.233.190.23:6060/GetConfig/1704100009?UserName=DEMO&SessionId=123&Type=All`

### GETDVRSnapshotimage

`http://183.233.190.23:6060/SnapPicture/1704100009?UserName=DEMO&SessionId=123&ChannelId=0&PictureType=0&PictureQuality=0&SnapTime=0`

### FormatDvrSD

`http://183.233.190.23:6060/RemoteOperate/1704100009?UserName=admin&SessionId=123`

### GetDevicesRealtimeAlarm

`http://183.233.190.23:6061/software/424/getalarmdemo.rar`

### get record file list from alarm ID

`http://183.233.190.23:6060/GetRecordFromAlarmId/100?UserName=555555&DeviceId=2110090007&AlarmId=20230918092517&SessionId=`

### get record file list of dvr

`http://183.233.190.23:6060/GetDeviceFileList/1704100005?FileType=1&ChannelIdMask=255&BeginTime=2020~04~28~00~00~00&EndTime=2020~04~28~23~59~59&SessionId=85961`

### SetDVRParameter

`http://183.233.190.23:6060/SetConfig/1704100009?UserName=admin&SessionId=123`

### GetCurrentGPSInfo

`http://183.233.190.23:6060/GetDevicesGps/100?UserName=DEMO&IsNeedPush=0`

### GetDevicesRealtimeGPS

`http://183.233.190.23:6061/software/424/getgpsdemo.rar`

### SetUpload Video Time

`http://183.233.190.23:6060/SetUploadVideoTime/100?UserName=mbel&SessionId=xxxxxxxxx`

### DownloadRecordFile

`http://183.233.190.23:6061/DownloadRecordFile.php?User=555555&GlobalSessionId=15670&FileId=2534590`

`http://183.233.190.23:6061/DownloadRecordFile.php?User=555555&GlobalSessionId=15670&`

### GetDevicesAlarm

`http://183.233.190.23:6060/GetDevicesAlarm/100?UserName=555555&SessionId=&IsNeedPush=1`

### query upload status of event record

`http://183.233.190.23:6060/QueryEventRecordStatus/100?EventId=9e5b1250-7a92-47b2-aec3-6502408c0e0d&UserName=admin`

### GetDeviceOnlineOfflineLog

`http://183.233.190.23:6060/GetDeviceOnlineOfflineLog/100?SessionId=3921&User=DEMO&DeviceId=1704100009&BeginTime=2022~01~05~16~00~00&EndTime=2022~01~06~15~59~59&UtcFlag=1`

### RebootDvr

`http://183.233.190.23:6060/RemoteOperate/1704100009?UserName=admin&SessionId=123`

### get log or record of dvr

`http://183.233.190.23:8083/DownloadDeviceFile/20200224132123_NM_0303667_0161850578_1920_1080_25_04194304_0000000000AAAAAA_04_1803130018_04_259_0000000_V02_001_E08_0.avi?DeviceId=1803130018&UserName=admin&SessionId=11&FileOffset=0&FileType=1`

### GetRecordFileList

`http://183.233.190.23:6060/GetRecordFileList/100?User=555555&SessionId=15670&DeviceId=2107220019&RecordType=0&BeginTime=2022~02~09~00~00~00&EndTime=2022~02~09~23~59~59&CmsClientId=222682579`

### voice Intercom

`http://183.233.190.23:6061/software/424/VoiceTalkDemo.zip`

### GetDevicesLastState

`http://183.233.190.23:6060/GetDevicesLastState/100?UserName=DEMO&SessionId=24208`

### GetVehicle'sGPShistory

`http://183.233.190.23:6060/GetGpsHistoryTrack/100?UserName=DEMO&SessionId=123&DeviceId=2110090004&BeginTime=2024~06~24~00~00~00&EndTime=2024~06~24~23~59~59`

### online playback of device

`http://183.233.190.23:6061/software/424/PlaybackVideoDeviceflvDemo.zip`

### GetAlarmHistory

`http://183.233.190.23:6060/GetAlarmHistoryData/100?DeviceId=2110090017&AlarmType=128&BeginTime=2024~06~24~00~00~00&EndTime=2024~06~24~23~59~59&SessionId=153930`

## Realtime and Media Notes

- Live video uses FLV: `/OpenDeviceStream/100?DeviceId=...&ChannelId=...&RealTime=1&UserName=...&SessionId=...`.
- Device playback examples use `/PlaybackDevice/{FileName}` on port 8083.
- Server playback examples use `/PlayBackOnline/{FileName}` on port 8083.
- Server-side record files are discovered with `/GetRecordFileList/100`, then downloaded with `/DownloadRecordFile.php?User=...&GlobalSessionId=...&FileId=...`.
- Voice intercom is documented as WebSocket `/VoiceIntercom/100` on port 8082 with `DeviceId`, `AudioType`, `SampleRate`, `UserName`, and `SessionId`.

## S3 / Notification File Layouts

The docs include S3-style upload paths rather than REST callbacks for several notification classes:

| Notification | Upload path |
|---|---|
| Regular data | `/<Bucket_Name>/regular_data/<UserName>/<DeviceId>/<YYYY-MM>/<DD>/<guid()>.json` |
| Event report | `/<Bucket_Name>/event/<UserName>/<DeviceId>/<YYYY-MM>/<DD>/<EventId>.json` |
| Upload video file | `/<Bucket_Name>/video/<UserName>/<DeviceId>/<YYYY-MM>/<DD>/<VideoId>/<VideoFileName>` |
| Device error | `/<Bucket_Name>/error/<UserName>/<DeviceId>/<YYYY-MM>/<DD>/<guid()>.json` |

## Important Time Formats

- Many REST queries use `YYYY~MM~DD~HH~MM~SS`.
- File-list docs mark begin/end time as UTC.
- Response timestamps often use `YYYY-MM-DD HH:MM:SS`.

## CAS-Relevant Alarm Types

| Type | Meaning |
|---:|---|
| 32 | DMS fatigue |
| 33 | DMS distraction |
| 35 | DMS smoking |
| 36 | DMS calling |
| 37 | ADAS pedestrian collision warning |
| 38 | ADAS forward collision warning |
| 39 | ADAS lane departure warning |
| 40 | ADAS over speed warning |
| 41 | Snapshot |
| 47 | DMS yawn |
| 48 | DMS face recognition failure |
| 62 | DMS not wearing seat belt |
| 80 | ADAS headway monitoring and warning |
| 87 | Monitor disconnected |
| 95 | DMS severe fatigue alarm |

## HTTP and Error Codes

| HTTP | Message | Meaning |
|---:|---|---|
| 200 | Success OK | Request succeeded. |
| 400 | Client Bad Request | Bad grammar or request cannot be satisfied. |
| 401 | Client Unauthorized | Unauthorized or invalid session. |
| 402 | URL not exist | Requested URL does not exist. |
| 403 | Server is too busy | Server busy. |
| 500 | Server error | Server-side failure. |

Common API error codes from the docs:

| Code | Meaning |
|---:|---|
| 1010001 | Invalid HTTP session id. |
| 1010002 | Invalid username. |
| 1010004 | Invalid JSON format. |
| 1010006 | DeviceId does not exist. |
| 1010008 | User authority forbidden. |
| 1010012 | User does not control this device. |
| 1010013 | Invalid password. |
| 1010017 | Device is not online. |
| 1010018 | Invalid POST data. |
| 2000002 | Camera blocked. |
| 2000003 | Camera has no signal input. |
| 2010000 | No disk available. |
| 2020001 | Server dropped. |
| 2050000 | GPS connection failed. |
| 2060009 | No recording written for 10 minutes. |
| 2070002 | No video. |
| 2070003 | Time out of range. |

## Integration Plan for IRYS CAS

1. Login with `RecordDataAuthentication`, store `SessionId` server-side only.
2. Load roster from `GetDeviceList`, map Stonkam `DeviceId` to IRYS unit IDs.
3. Poll `GetDevicesLastState` or `GetDevicesGps` for live state and GPS freshness.
4. Query `GetAlarmHistoryData` for ADAS, DMS and recorder events.
5. Query `GetDeviceLogInfo` and `GetConfig/{DeviceId}` for camera, disk, recording and network health.
6. Use `GetRecordFileList` plus `DownloadRecordFile.php` for alarm video retrieval.
7. Use `OpenDeviceStream` only inside a controlled video viewer, because it returns FLV stream data.
