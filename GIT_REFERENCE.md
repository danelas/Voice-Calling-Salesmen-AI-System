# Git Reference Guide - Voice Sales AI System

## 🚀 **Initial Setup & Push to Main Branch**

### **Complete Setup Commands**
```bash
# Navigate to project directory
cd C:\Users\dandu\CascadeProjects\voice-sales-ai

# Initialize Git repository
git init

# Add remote repository (GitHub)
git remote add origin https://github.com/danelas/Voice-Calling-Salesmen-AI-System.git

# Add all files to staging
git add .

# Create initial commit
git commit -m "Initial commit: Voice Sales AI System

- Complete Node.js/Express backend with Prisma ORM
- AI integrations: OpenAI GPT-4, ElevenLabs TTS, TextMagic SMS
- Comprehensive API endpoints for leads, calls, analytics, dashboard
- Advanced logging and debugging system
- Production-ready deployment configuration for Render
- Complete documentation and troubleshooting guides"

# Set default branch to main (not master)
git branch -M main

# Push to main branch and set upstream
git push -u origin main
```

## 📋 **Future Development Workflow**

### **Daily Development Commands**
```bash
# Check status of changes
git status

# Add specific files
git add filename.js
# OR add all changes
git add .

# Commit with descriptive message
git commit -m "Add: New feature description"
git commit -m "Fix: Bug description"
git commit -m "Update: Enhancement description"

# Push to main branch
git push origin main
```

### **Branch Management**
```bash
# Create new feature branch
git checkout -b feature/new-feature-name

# Switch between branches
git checkout main
git checkout feature/new-feature-name

# Merge feature branch to main
git checkout main
git merge feature/new-feature-name

# Delete feature branch after merge
git branch -d feature/new-feature-name

# Push new branch to remote
git push -u origin feature/new-feature-name
```

### **Pulling Updates**
```bash
# Pull latest changes from main
git pull origin main

# Pull with rebase (cleaner history)
git pull --rebase origin main

# Fetch without merging
git fetch origin
```

## 🔄 **Common Scenarios**

### **Scenario 1: First Time Setup**
```bash
git init
git remote add origin https://github.com/danelas/Voice-Calling-Salesmen-AI-System.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### **Scenario 2: Repository Already Exists**
```bash
# Clone existing repository
git clone https://github.com/danelas/Voice-Calling-Salesmen-AI-System.git
cd Voice-Calling-Salesmen-AI-System

# Make changes, then:
git add .
git commit -m "Your commit message"
git push origin main
```

### **Scenario 3: Force Push (Use Carefully)**
```bash
# WARNING: This overwrites remote repository
git push -f origin main
```

### **Scenario 4: Merge Conflicts Resolution**
```bash
# Pull latest changes
git pull origin main

# Resolve conflicts in files, then:
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## 📝 **Commit Message Standards**

### **Format**
```
Type: Brief description

Detailed explanation (if needed)
- Bullet points for multiple changes
- Reference issue numbers if applicable
```

### **Types**
- **Add:** New features or files
- **Fix:** Bug fixes
- **Update:** Improvements to existing features
- **Remove:** Deleted files or features
- **Refactor:** Code restructuring
- **Docs:** Documentation changes
- **Style:** Formatting, no code changes
- **Test:** Adding or updating tests

### **Examples**
```bash
git commit -m "Add: OpenAI conversation analytics feature"

git commit -m "Fix: Database connection timeout issue

- Increase connection timeout to 30 seconds
- Add retry logic for failed connections
- Update error handling for connection failures"

git commit -m "Update: ElevenLabs voice synthesis performance

- Optimize audio generation speed
- Add voice caching mechanism
- Reduce API calls by 40%"
```

## 🔧 **Useful Git Commands**

### **Information Commands**
```bash
# View commit history
git log --oneline

# View changes in files
git diff

# View remote repositories
git remote -v

# View all branches
git branch -a

# View current branch
git branch --show-current
```

### **Undo Commands**
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Undo specific file changes
git checkout -- filename.js

# Unstage files
git reset HEAD filename.js
```

### **Cleanup Commands**
```bash
# Remove untracked files
git clean -f

# Remove untracked directories
git clean -fd

# View what would be cleaned
git clean -n
```

## 🏷️ **Tagging Releases**

### **Create Tags**
```bash
# Create lightweight tag
git tag v1.0.0

# Create annotated tag with message
git tag -a v1.0.0 -m "Version 1.0.0: Initial release"

# Push tags to remote
git push origin --tags

# Push specific tag
git push origin v1.0.0
```

### **Version Numbering**
- **v1.0.0** - Major release
- **v1.1.0** - Minor update (new features)
- **v1.1.1** - Patch (bug fixes)

## 🔒 **Security & Best Practices**

### **Files to NEVER Commit**
```bash
# Already in .gitignore:
.env
.env.local
.env.production
node_modules/
logs/
*.log
audio/
temp/
.DS_Store
Thumbs.db
```

### **Pre-Commit Checklist**
- [ ] Remove any API keys or sensitive data
- [ ] Test code locally
- [ ] Update documentation if needed
- [ ] Write descriptive commit message
- [ ] Check .gitignore is working

### **Repository Settings**
```bash
# Set user info (first time only)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set default branch to main
git config --global init.defaultBranch main
```

## 🚀 **Deployment Integration**

### **Render Auto-Deploy**
When you push to main, Render will automatically:
1. Pull latest code
2. Install dependencies (`npm install`)
3. Run build commands
4. Deploy to production

### **GitHub Actions (Optional)**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Render
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        # Add deployment steps
```

## 📊 **Project-Specific Commands**

### **Voice Sales AI Specific**
```bash
# After cloning, setup project:
npm install
cp .env.example .env
# Edit .env with API keys
npx prisma migrate dev
npx prisma generate
npm run quick-check

# Before committing changes:
npm run quick-check
npm test  # if tests exist
git add .
git commit -m "Your message"
git push origin main
```

### **Quick Development Cycle**
```bash
# Make changes to code
# Test changes
npm run quick-check

# Commit and push
git add .
git commit -m "Update: Description of changes"
git push origin main
```

## 🆘 **Emergency Commands**

### **Completely Reset to Remote**
```bash
git fetch origin
git reset --hard origin/main
```

### **Undo Last Push (Dangerous)**
```bash
git reset --hard HEAD~1
git push -f origin main
```

### **Recover Deleted Files**
```bash
git checkout HEAD -- filename.js
```

## 📚 **Quick Reference**

| Command | Description |
|---------|-------------|
| `git status` | Check current status |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit with message |
| `git push origin main` | Push to main branch |
| `git pull origin main` | Pull latest changes |
| `git log --oneline` | View commit history |
| `git branch` | List branches |
| `git checkout -b branch-name` | Create new branch |

## 🎯 **Remember**

1. **Always use `main` branch** (not master)
2. **Never commit sensitive data** (.env files, API keys)
3. **Write descriptive commit messages**
4. **Test before pushing**
5. **Pull before pushing** if working with others
6. **Use branches for features**
7. **Tag important releases**

---

**Save this file for future reference!** 📖

This guide covers all Git operations you'll need for the Voice Sales AI project and any future projects.
