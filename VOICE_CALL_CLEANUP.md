# Voice Call Auto-Cleanup System

## Overview
This system automatically closes empty voice call rooms after 5 minutes of inactivity.

## How It Works

### 1. Room Empty Detection
When the last participant leaves a room:
- Status changes from `ACTIVE` to `WAITING`
- `emptyAt` timestamp is recorded
- Room waits for 5 minutes

### 2. Auto Cleanup (After 5 Minutes)
The cleanup job runs periodically and:
- Finds all `WAITING` rooms that have been empty for 5+ minutes
- Changes their status to `ENDED`
- Records `endedAt` timestamp

### 3. Re-activation
If someone joins a room in `WAITING` state:
- Status returns to `ACTIVE`
- `emptyAt` is cleared
- Room becomes active again

## Database Schema

```prisma
model voicecall {
  ...
  status    String        // ACTIVE, WAITING, ENDED
  emptyAt   DateTime?     // When room became empty
  ...
}
```

## API Endpoints

### POST `/api/voice-calls/leave`
- Removes participant from call
- Sets status to `WAITING` and records `emptyAt` if room becomes empty

### POST `/api/voice-calls/cleanup`
- Manually triggers cleanup job
- Ends all expired rooms (empty for 5+ minutes)
- Returns count of cleaned rooms

### GET `/api/cron/voice-cleanup`
- Cron endpoint that calls cleanup endpoint
- Should be triggered by external cron service every 1 minute

## Setup (Recommended)

### Using Vercel Cron (if deployed to Vercel)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/voice-cleanup",
      "schedule": "* * * * *"
    }
  ]
}
```

### Using External Cron Service (Cron-job.org, etc.)
- Set up a cron job to POST to `https://your-domain.com/api/voice-calls/cleanup`
- Run every 1 minute for optimal cleanup
- Or run every 5-10 minutes for less frequent checks

### Manual Testing
```bash
curl -X POST http://localhost:3000/api/voice-calls/cleanup
```

## Status Flow

```
ACTIVE ─┬─> WAITING ─> ENDED (after 5 min)
        │                ▲
        └─────────────────┘
        (if someone rejoins)
```

## UI Updates

### Friends Page - Call History
- Updated participant display to Thai: "ผู้เข้าร่วม" (instead of "participant/participants")
- Display: "5 ผู้เข้าร่วม" or "1 ผู้เข้าร่วม"

## Future Improvements

1. **Notification System**: Notify room creator when room will auto-close
2. **Configurable Timeout**: Make 5-minute timeout configurable per call mode
3. **Activity Monitoring**: Track if participants are idle vs. actually in call
4. **Batch Cleanup**: Optimize database queries for large-scale cleanup
5. **Metrics**: Track cleanup statistics for monitoring
