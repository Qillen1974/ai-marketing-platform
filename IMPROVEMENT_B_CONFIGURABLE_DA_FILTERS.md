# IMPROVEMENT B: User-Configurable Domain Authority Filters

## Overview

Instead of hardcoding DA limits, let users choose what level of opportunities they want to pursue.

**Benefit:** SaaS flexibility - each user gets what they need!

---

## User Personas & Their Needs

### Startup / New Site
```
User Profile: New website, low authority
Goal: Easy wins with small sites
Preference: DA 10-40 (easy to get links)
```

### Growing Site
```
User Profile: 1-2 year old site, moderate authority
Goal: Balanced growth
Preference: DA 30-60 (mix of easy and moderate)
```

### Established Brand
```
User Profile: 3+ years, good authority
Goal: Premium placement
Preference: DA 50-80 (quality over quantity)
```

### Aggressive Growth (Agencies)
```
User Profile: Multiple clients, diverse needs
Goal: Flexible approach per client
Preference: Custom ranges per campaign
```

---

## Implementation Plan

### Database Changes (Required)

#### 1. Add Settings Table

```sql
-- New table to store user preferences
CREATE TABLE backlink_discovery_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  min_domain_authority INTEGER DEFAULT 10,
  max_domain_authority INTEGER DEFAULT 60,
  min_difficulty INTEGER DEFAULT 20,
  max_difficulty INTEGER DEFAULT 70,
  include_high_authority_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);
```

#### 2. Add Preferences to Campaign/Website

```sql
-- Optional: Store settings per campaign for granularity
ALTER TABLE campaigns ADD COLUMN
  backlink_da_min INTEGER DEFAULT 10;

ALTER TABLE campaigns ADD COLUMN
  backlink_da_max INTEGER DEFAULT 60;
```

---

## API Changes (Backend)

### 1. Get User Settings Endpoint

```javascript
// GET /api/user/backlink-settings
router.get('/backlink-settings', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'SELECT * FROM backlink_discovery_settings WHERE user_id = $1',
      [userId]
    );

    const settings = result.rows[0] || {
      min_domain_authority: 10,
      max_domain_authority: 60,
      min_difficulty: 20,
      max_difficulty: 70,
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});
```

### 2. Update Settings Endpoint

```javascript
// POST /api/user/backlink-settings
router.post('/backlink-settings', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const {
    min_domain_authority,
    max_domain_authority,
    min_difficulty,
    max_difficulty
  } = req.body;

  // Validate
  if (max_domain_authority <= min_domain_authority) {
    return res.status(400).json({
      error: 'Max DA must be greater than min DA'
    });
  }

  try {
    await pool.query(
      `INSERT INTO backlink_discovery_settings
       (user_id, min_domain_authority, max_domain_authority, min_difficulty, max_difficulty)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
       min_domain_authority = $2,
       max_domain_authority = $3,
       min_difficulty = $4,
       max_difficulty = $5,
       updated_at = NOW()`,
      [userId, min_domain_authority, max_domain_authority, min_difficulty, max_difficulty]
    );

    res.json({
      message: 'Settings updated successfully',
      settings: {
        min_domain_authority,
        max_domain_authority,
        min_difficulty,
        max_difficulty
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
```

### 3. Update Backlink Discovery to Use Settings

```javascript
// In backlinkService.js
const discoverBacklinkOpportunities = async (domain, keywords, userSettings) => {
  // Use user settings or defaults
  const minDA = userSettings?.min_domain_authority || 10;
  const maxDA = userSettings?.max_domain_authority || 60;
  const minDifficulty = userSettings?.min_difficulty || 20;
  const maxDifficulty = userSettings?.max_difficulty || 70;

  console.log(`⚙️  Using DA range: ${minDA}-${maxDA} (difficulty: ${minDifficulty}-${maxDifficulty})`);

  // Filter backlinks using user preferences
  const opportunities = allBacklinks.filter(backlink => {
    const da = backlink.domainAuthority;
    const difficulty = estimateDifficultyFromAuthority(da);

    return (
      da >= minDA &&
      da <= maxDA &&
      difficulty >= minDifficulty &&
      difficulty <= maxDifficulty
    );
  });

  return opportunities;
};
```

---

## Frontend Changes (UI/UX)

### 1. Settings Page / Modal

```jsx
// Component: BacklinkSettingsPanel
const BacklinkSettingsPanel = () => {
  const [settings, setSettings] = useState({
    min_domain_authority: 10,
    max_domain_authority: 60,
    min_difficulty: 20,
    max_difficulty: 70,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/backlink-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert('Settings saved successfully!');
      }
    } catch (error) {
      alert('Error saving settings');
    }
    setLoading(false);
  };

  return (
    <div className="backlink-settings">
      <h3>Backlink Opportunity Preferences</h3>

      <div className="setting-group">
        <label>Domain Authority Range</label>
        <div className="range-inputs">
          <input
            type="number"
            min="1"
            max="100"
            value={settings.min_domain_authority}
            onChange={(e) => setSettings({
              ...settings,
              min_domain_authority: parseInt(e.target.value)
            })}
            placeholder="Min DA"
          />
          <span>-</span>
          <input
            type="number"
            min="1"
            max="100"
            value={settings.max_domain_authority}
            onChange={(e) => setSettings({
              ...settings,
              max_domain_authority: parseInt(e.target.value)
            })}
            placeholder="Max DA"
          />
        </div>
        <small>Leave room for growth: 10-60 for starters, 50-90 for established sites</small>
      </div>

      <div className="setting-group">
        <label>Difficulty Range</label>
        <div className="range-inputs">
          <input
            type="number"
            min="1"
            max="100"
            value={settings.min_difficulty}
            onChange={(e) => setSettings({
              ...settings,
              min_difficulty: parseInt(e.target.value)
            })}
            placeholder="Min Difficulty"
          />
          <span>-</span>
          <input
            type="number"
            min="1"
            max="100"
            value={settings.max_difficulty}
            onChange={(e) => setSettings({
              ...settings,
              max_difficulty: parseInt(e.target.value)
            })}
            placeholder="Max Difficulty"
          />
        </div>
        <small>20-70 recommended for achievable targets</small>
      </div>

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Saving...' : 'Save Settings'}
      </button>

      <PresetOptions
        onSelect={(preset) => setSettings(preset)}
      />
    </div>
  );
};
```

### 2. Preset Options (Quick Selection)

```jsx
const PresetOptions = ({ onSelect }) => {
  const presets = {
    startup: {
      label: 'Startup / New Site',
      min_domain_authority: 10,
      max_domain_authority: 40,
      min_difficulty: 10,
      max_difficulty: 50,
      description: 'Easy wins with smaller sites'
    },
    growing: {
      label: 'Growing Site',
      min_domain_authority: 30,
      max_domain_authority: 60,
      min_difficulty: 25,
      max_difficulty: 65,
      description: 'Balanced mix of easy and moderate'
    },
    established: {
      label: 'Established Brand',
      min_domain_authority: 50,
      max_domain_authority: 80,
      min_difficulty: 40,
      max_difficulty: 80,
      description: 'Quality over quantity'
    },
    aggressive: {
      label: 'Aggressive Growth',
      min_domain_authority: 20,
      max_domain_authority: 90,
      min_difficulty: 20,
      max_difficulty: 90,
      description: 'All opportunities'
    }
  };

  return (
    <div className="preset-options">
      <h4>Quick Presets</h4>
      {Object.entries(presets).map(([key, preset]) => (
        <button
          key={key}
          onClick={() => onSelect(preset)}
          className="preset-btn"
        >
          <strong>{preset.label}</strong>
          <small>{preset.description}</small>
          <span>DA {preset.min_domain_authority}-{preset.max_domain_authority}</span>
        </button>
      ))}
    </div>
  );
};
```

### 3. Show Settings in Discovery UI

```jsx
// When user runs discovery, show what settings are being used
<div className="discovery-info">
  <p>⚙️ Showing opportunities with DA {settings.min_da}-{settings.max_da} (difficulty {settings.min_diff}-{settings.max_diff})</p>
  <a href="/settings/backlinks">Change preferences</a>
</div>
```

---

## Implementation Steps

### Phase 1: Backend (2-3 hours)
- [ ] Create database table
- [ ] Create GET/POST API endpoints
- [ ] Update backlinkService.js to use settings
- [ ] Update discovery controller to fetch settings
- [ ] Test with curl/Postman

### Phase 2: Frontend (2-3 hours)
- [ ] Create settings component
- [ ] Add to user settings page
- [ ] Add preset buttons
- [ ] Show current settings during discovery
- [ ] Add link to change settings

### Phase 3: Testing (1 hour)
- [ ] Test different DA ranges
- [ ] Verify settings persist
- [ ] Test presets work correctly
- [ ] Check discovery uses correct settings

### Phase 4: Polish (1 hour)
- [ ] Add validation (min < max)
- [ ] Add helpful hints/tooltips
- [ ] Show example opportunities per preset
- [ ] Add analytics/logging

---

## Database Schema

```sql
CREATE TABLE backlink_discovery_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Domain Authority filters
  min_domain_authority INTEGER DEFAULT 10 CHECK (min_domain_authority >= 1 AND min_domain_authority <= 100),
  max_domain_authority INTEGER DEFAULT 60 CHECK (max_domain_authority >= 1 AND max_domain_authority <= 100),

  -- Difficulty filters
  min_difficulty INTEGER DEFAULT 20 CHECK (min_difficulty >= 1 AND min_difficulty <= 100),
  max_difficulty INTEGER DEFAULT 70 CHECK (max_difficulty >= 1 AND max_difficulty <= 100),

  -- Optional: minimum traffic threshold
  min_traffic INTEGER DEFAULT 0,

  -- Optional: exclude certain domains/types
  exclude_edu_gov BOOLEAN DEFAULT false,
  exclude_news_sites BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Check that ranges make sense
  CONSTRAINT valid_da_range CHECK (min_domain_authority <= max_domain_authority),
  CONSTRAINT valid_difficulty_range CHECK (min_difficulty <= max_difficulty)
);

-- Create index for fast lookups
CREATE INDEX idx_user_settings ON backlink_discovery_settings(user_id);
```

---

## API Documentation

### GET /api/user/backlink-settings
Get user's current backlink discovery settings

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "min_domain_authority": 10,
  "max_domain_authority": 60,
  "min_difficulty": 20,
  "max_difficulty": 70,
  "created_at": "2025-11-18T10:00:00Z",
  "updated_at": "2025-11-18T10:00:00Z"
}
```

### POST /api/user/backlink-settings
Update user's backlink discovery settings

**Request:**
```json
{
  "min_domain_authority": 20,
  "max_domain_authority": 50,
  "min_difficulty": 25,
  "max_difficulty": 60
}
```

**Response:**
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "min_domain_authority": 20,
    "max_domain_authority": 50,
    "min_difficulty": 25,
    "max_difficulty": 60
  }
}
```

---

## User Benefits

| Feature | Benefit |
|---------|---------|
| **Easy Presets** | Users don't have to figure out optimal ranges |
| **Custom Ranges** | Power users can fine-tune for their needs |
| **Per-User Settings** | Different users/teams can have different preferences |
| **Clear Feedback** | Users see what settings they're using during discovery |
| **Flexibility** | Can change settings anytime without rebuilding |

---

## Future Enhancements

### 1. Per-Campaign Settings
```javascript
// Override user defaults for specific campaign
POST /api/campaigns/:campaignId/backlink-settings
```

### 2. Analytics
```javascript
// Track which DA ranges work best
GET /api/user/backlink-analytics
// Returns: success rate by DA range, best conversion DA, etc.
```

### 3. Smart Recommendations
```javascript
// AI suggests optimal range based on user's site authority
GET /api/user/recommended-backlink-settings
// Returns: recommended DA range based on their domain authority
```

### 4. Integration with Auto-Discovery
```javascript
// Automatically adjust settings based on user's domain authority
// New site (DA 5-10) → Recommend DA 10-40
// Mid-stage site (DA 20-30) → Recommend DA 25-60
// Established site (DA 40+) → Recommend DA 40-80
```

---

## Configuration in Code

### Default Settings (for new users)

```javascript
const DEFAULT_BACKLINK_SETTINGS = {
  min_domain_authority: 10,
  max_domain_authority: 60,
  min_difficulty: 20,
  max_difficulty: 70,
};
```

### Preset Definitions

```javascript
const BACKLINK_PRESETS = {
  startup: {
    min_domain_authority: 10,
    max_domain_authority: 40,
    min_difficulty: 10,
    max_difficulty: 50,
  },
  growing: {
    min_domain_authority: 30,
    max_domain_authority: 60,
    min_difficulty: 25,
    max_difficulty: 65,
  },
  established: {
    min_domain_authority: 50,
    max_domain_authority: 80,
    min_difficulty: 40,
    max_difficulty: 80,
  },
  aggressive: {
    min_domain_authority: 20,
    max_domain_authority: 90,
    min_difficulty: 20,
    max_difficulty: 90,
  },
};
```

---

## Summary

**This approach:**
- ✅ Gives users control over their own preferences
- ✅ Makes the platform more flexible
- ✅ Supports different user types/stages
- ✅ Can be enhanced later with smart recommendations
- ✅ SaaS-appropriate (user-configurable)

**Implementation time:** 5-7 hours total
**Complexity:** Medium (DB changes + API + UI)
**User impact:** High (much better experience)

---

## Next Steps

1. **Decide:** Implement with presets or let users set manually (or both)?
2. **Design:** Sketch UI for settings panel
3. **Code backend:** Database + API endpoints
4. **Code frontend:** Settings component
5. **Test:** Different DA ranges and presets
6. **Deploy:** New version with user-configurable settings
7. **Monitor:** Track which preset users choose
