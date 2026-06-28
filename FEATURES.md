# FORGE Feature Documentation

## Recent Updates

This document describes the major features added to FORGE: the Visual Explorer mode and enhanced spam protection system.

---

## 🎨 Visual Explorer Mode

The Visual Explorer is a live rendering engine that transforms FORGE commands into interactive visual components in real-time.

### What it does

Instead of just running commands in the terminal, the Visual Explorer displays your portfolio content as beautifully styled interface blocks — while you're writing the code.

### Modes

FORGE now supports three view modes:

| Mode | Description | Shortcut |
|------|-------------|----------|
| **Code** | Monaco editor only (traditional code editing) | `Ctrl+Shift+V` |
| **Split** | Side-by-side code + visual preview | `Ctrl+Shift+V` |
| **Visual** | Full-screen visual output only | `Ctrl+Shift+V` |

### Visual Components

The Visual Explorer renders these components based on your FORGE commands:

#### 1. **Discover Desk**
```forge
discover
```
Shows a welcome message and clickable workspace file grid to explore the portfolio.

#### 2. **Identity Card**
```forge
show about
```
Renders a professional identity card with:
- Name, role, location
- Bio and coding experience
- Social links (GitHub, Twitter, Email)

#### 3. **Project Register**
```forge
show projects
```
Displays an interactive grid of all shipped projects with:
- Real-time search filtering
- Stack tags
- Click to inspect individual projects

#### 4. **Project Inspector**
```forge
inspect sheriff
inspect surfer
inspect acencert
```
Deep-dive view for specific projects showing:
- Full description and features
- Technology stack breakdown
- Live repository link
- Lessons learned

#### 5. **Skills Matrices**
```forge
show skills
```
Visual skill breakdown with:
- Languages (Python, JavaScript, HTML/CSS, Bash)
- Frontend frameworks (React, Next.js, Tailwind)
- Backend & integrations
- Tools & creative skills
- Progress bars with percentage indicators

#### 6. **Experience Timeline**
```forge
show experience
```
Chronological career log with:
- Hackathon wins (CodeDay IIT Delhi, Counterspell Delhi)
- Independent projects
- Learning milestones
- Vertical timeline layout with dates

#### 7. **Contact Console**
```forge
show contact
```
Live contact form with:
- Multi-step input (name, email, subject, message)
- Real-time validation
- Anti-spam telemetry
- Transmission logs

### How it works

1. **Real-time Analysis**: The Visual Explorer parses your `.forge` file line-by-line
2. **Command Detection**: Identifies `show`, `inspect`, and `discover` commands
3. **Component Mapping**: Maps commands to visual components
4. **Live Rendering**: Updates the visual panel as you type
5. **Interactive Elements**: Clickable projects, forms, and navigation

### Double-Click Magic

Double-click any command line in the code editor (like `show projects` or `inspect sheriff`) and FORGE automatically switches to Visual mode to show the output.

---

## 🛡️ Enhanced Spam Protection

A multi-layered security system that blocks spam and bots while keeping the contact form accessible to real humans.

### Security Layers

#### 1. **IP Blocking & Rate Limiting**
```typescript
- Tracks IP reputation
- Auto-bans IPs after repeated spam attempts
- 24-hour ban duration that multiplies with violations
- Rate limits: prevents spam floods from same IP
```

#### 2. **Honeypot Trap**
```typescript
- Hidden "website" field invisible to humans
- Bots auto-fill it = instant 100-point spam score
- Silent blocking technique
```

#### 3. **Disposable Email Detection**
```typescript
Blocks 80+ temporary email providers:
- mail.tm, guerrillamail, 10minutemail
- tempmail, yopmail, mailinator
- Subdomain detection (blocks sub.mail.tm)
```

**Response:**
> "Temporary email addresses aren't supported. Please use your personal email, or contact me directly at ggambhir1919@gmail.com"

#### 4. **Behavioral Telemetry**
Tracks human typing patterns:

| Metric | Bot Detection | Penalty |
|--------|---------------|---------|
| **Mouse movements** | 0 movements = bot | +15 points |
| **Keystroke count** | 0 keystrokes = bot | +20 points |
| **Typing speed** | < 15ms per key = bot | +25 points |
| **Interval variance** | Perfectly uniform typing = bot | +25 points |
| **Form speed** | Submitted in < 3 seconds | +25 points |
| **Missing telemetry** | No behavior data sent | +50 points |

#### 5. **Content Analysis**

**Spam Keywords** (+20 points):
```
seo, marketing, casino, crypto, bitcoin, viagra,
backlinks, forex, make money, click here, etc.
```

**URL Detection**:
- 2+ URLs = +20 points
- 5+ URLs = +40 points

**Suspicious Domains** (+100 points, instant block):
```
.zip, .xyz, .ru, .cn, .top, .click
```

**Blacklisted Link Categories** (+100 points):
```
Crypto, gambling, adult content
```

**Pattern Detection**:
- Repeated characters (`aaaa`, `!!!!`) = +30 points
- Repeated words (`hello hello hello`) = +20 points
- Excessive emojis (>5) = +10 points
- Markdown spam links = +20 points

#### 6. **Gibberish Detection** (+50 points)

Checks name, subject, AND message for keyboard smashing:

```typescript
Examples of blocked gibberish:
- "fsdfds" (no vowels)
- "qwerty" (keyboard pattern)
- "asdfgh" (row smashing)
- "jjjjjj" (repeated consonants)

Safe exceptions: css, sql, npm, tsx, jsx, github, docker
```

**Detection methods:**
- No vowels in 3+ letter words
- 85%+ consonant ratio
- Repeating consonants with no vowels
- Scans all fields (not just message)

#### 7. **Duplicate Detection** (+100 points, instant block)

Checks last 24 hours for:
- Exact message duplicates
- 80%+ similar messages (Jaccard similarity)
- Same subject line 3+ times
- Same IP sending 2+ similar messages

### Scoring System

```typescript
Score    Status      Action
─────────────────────────────────────────────
0-39     ✅ Approved  Email sent to inbox
40-69    ⏸️  Pending   Saved for review, no email
70+      ❌ Spam      Blocked with helpful message
```

### User Experience

**Approved submissions:**
```
✅ "Thanks for reaching out! I've received your message 
   and will get back to you as soon as possible."
```

**Blocked submissions:**
```
❌ "Your message couldn't be sent due to spam filters. 
   Please email me directly at ggambhir1919@gmail.com"
   
   Reasons: Gibberish detected: fsdfds, dsdfsf
```

**Disposable emails:**
```
❌ "Temporary email addresses aren't supported. 
   Please use your personal email, or contact me 
   directly at ggambhir1919@gmail.com"
```

### Database Logging

All submissions are logged with:
- Sender details (name, email, subject, message)
- IP address and timestamp
- Spam score and status
- Detection reasons
- Behavioral telemetry (JSON)

### Admin Dashboard

View all submissions at `/admin`:
- Filter by status (approved/pending/spam)
- Sort by date, spam score, IP
- Review pending submissions
- Monitor spam patterns

---

## Technical Implementation

### Visual Explorer Architecture

```
┌─────────────────────────────────────────┐
│  forge-app.tsx                          │
│  ┌─────────────────┬─────────────────┐ │
│  │  editor-pane    │ visual-explorer │ │
│  │  (Monaco)       │ (React)         │ │
│  │                 │                 │ │
│  │  Code editing   │  Live preview   │ │
│  │  Syntax theme   │  Components     │ │
│  │  Autocomplete   │  Interactions   │ │
│  └─────────────────┴─────────────────┘ │
└─────────────────────────────────────────┘
```

**Key files:**
- `src/components/visual-explorer.tsx` - Main visual rendering engine
- `src/components/forge-app.tsx` - View mode orchestration
- `src/components/editor-pane.tsx` - Monaco editor wrapper
- `src/components/editor-tabs.tsx` - Mode switcher UI

### Spam Protection Architecture

```
┌────────────────────────────────────────────┐
│  POST /api/contact                         │
│  ┌──────────────────────────────────────┐ │
│  │  1. IP Ban Check (silent trap)       │ │
│  │  2. Rate Limiting                    │ │
│  │  3. Input Validation                 │ │
│  │  4. Disposable Email Check           │ │
│  │  5. Spam Scoring Engine              │ │
│  │  6. Database Logging                 │ │
│  │  7. Email Notification (if approved) │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

**Key files:**
- `src/app/api/contact/route.ts` - Main API handler
- `src/lib/spam-detector.ts` - Scoring engine
- `src/lib/disposable-emails.ts` - Email blocklist
- `src/lib/db.ts` - Supabase database functions
- `src/components/contact-modal.tsx` - Frontend telemetry

---

## Performance

### Visual Explorer
- **Parsing**: < 5ms for typical `.forge` files
- **Re-render**: Only on content change (not on every keystroke)
- **Animation**: 350ms smooth transitions between modes
- **Layout**: Monaco auto-layout on view mode change

### Spam Detection
- **API Response**: < 500ms including all checks
- **Database Queries**: Indexed lookups for duplicates
- **Rate Limiting**: Redis-like in-memory cache
- **Telemetry**: Lightweight client-side tracking

---

## Configuration

### Visual Explorer

Enable/disable features in `forge-app.tsx`:

```typescript
const [viewMode, setViewMode] = useState<"code" | "visual" | "split">("code");
```

### Spam Protection

Adjust thresholds in `spam-detector.ts`:

```typescript
// Spam score thresholds
if (score >= 70) status = "spam";         // Blocked
else if (score >= 40) status = "pending"; // Review
else status = "approved";                  // Sent
```

### Email Integration

Set your Resend API key in `.env.local`:

```env
RESEND_API_KEY=re_your_key_here
```

---

## Future Enhancements

### Visual Explorer
- [ ] Export visual components as images/PDF
- [ ] Custom themes for visual components
- [ ] Animation presets (fade, slide, zoom)
- [ ] Mobile-optimized visual layouts
- [ ] Fullscreen presentation mode

### Spam Protection
- [ ] Machine learning spam classifier
- [ ] CAPTCHA integration for suspicious submissions
- [ ] Email verification flow
- [ ] Whitelist trusted domains/IPs
- [ ] Custom spam rules via admin panel
- [ ] Webhook notifications for spam attempts

---

## Credits

**Built by Gautam Gambhir**
- GitHub: [@gautamxgambhir](https://github.com/gautamxgambhir)
- Twitter: [@gautamxgambhir](https://twitter.com/gautamxgambhir)
- Email: ggambhir1919@gmail.com

**Technologies Used**
- Next.js 16 & React 19
- Monaco Editor (VS Code engine)
- Framer Motion (animations)
- Supabase (database)
- Resend (email delivery)

---

<div align="center">
  <sub>Last updated: January 2025</sub>
</div>
