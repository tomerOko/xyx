#!/bin/bash

# Script to initialize a git repository and push it to GitHub
# Usage: ./git_init_push.sh

set -e  # Exit immediately if a command exits with a non-zero status

echo "🚀 Git Initialize and Push to GitHub Script 🚀"
echo "---------------------------------------------"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if current directory is already a git repository
if [ -d ".git" ]; then
    echo "⚠️ This directory is already a git repository."
    read -p "Do you want to continue anyway? (y/n): " continue_anyway
    if [ "$continue_anyway" != "y" ]; then
        echo "Operation cancelled."
        exit 0
    fi
else
    # Initialize git repository
    echo "🔧 Initializing git repository..."
    git init
    echo "✅ Git repository initialized."
fi

# Ask for GitHub repository details
read -p "Enter your GitHub username: " github_username
read -p "Enter the name for your GitHub repository: " repo_name
read -p "Enter a description for your repository (optional): " repo_description

# Create .gitignore file
echo "📝 Creating .gitignore file..."
read -p "Do you want to create a .gitignore file? (y/n): " create_gitignore
if [ "$create_gitignore" = "y" ]; then
    read -p "Enter file patterns to ignore (space separated): " ignore_patterns
    for pattern in $ignore_patterns; do
        echo "$pattern" >> .gitignore
    done
    echo "✅ .gitignore created."
fi

# Create README.md
echo "📝 Creating README.md file..."
read -p "Do you want to create a README.md file? (y/n): " create_readme
if [ "$create_readme" = "y" ]; then
    echo "# $repo_name" > README.md
    echo "" >> README.md
    echo "$repo_description" >> README.md
    echo "✅ README.md created."
fi

# Stage all files
echo "📦 Staging files..."
git add .
echo "✅ Files staged."

# Commit changes
echo "💾 Committing files..."
read -p "Enter commit message (default: 'Initial commit'): " commit_message
commit_message=${commit_message:-"Initial commit"}
git commit -m "$commit_message"
echo "✅ Files committed."

# Create GitHub repository using GitHub CLI or API
echo "🌐 Creating GitHub repository..."
read -p "Do you want to create the GitHub repository now? (y/n): " create_repo
if [ "$create_repo" = "y" ]; then
    # Check authentication before proceeding
echo "🔑 Checking GitHub authentication..."
ssh -T git@github.com 2>&1 | grep "Hi" || {
    echo "⚠️ SSH authentication issue detected!"
    echo "Your SSH configuration may be pointing to a different GitHub account."
    
    # Print existing SSH keys for user to check
    echo "Existing SSH keys:"
    ls -la ~/.ssh/ 2>/dev/null | grep "id_" || echo "No SSH keys found in default location."
    
    read -p "Would you like to continue with HTTPS authentication instead? (y/n): " use_https
    if [ "$use_https" = "y" ]; then
        use_ssh="n"  # Force HTTPS in the remote addition step
    else
        echo "Please fix your SSH configuration before continuing."
        echo "You may need to:"
        echo "1. Generate a new SSH key: ssh-keygen -t ed25519 -C \"your_email@example.com\""
        echo "2. Add it to the SSH agent: ssh-add ~/.ssh/id_ed25519"
        echo "3. Add the key to your GitHub account: https://github.com/settings/keys"
        echo "4. Run: ssh -T git@github.com to verify"
        read -p "Continue anyway? (y/n): " continue_anyway
        if [ "$continue_anyway" != "y" ]; then
            exit 1
        fi
    fi
}
    if command -v gh &> /dev/null; then
        echo "Using GitHub CLI to create repository..."
        # Check gh auth status, and ensure we're using the correct account
        gh auth status
        current_user=$(gh api user | grep login | cut -d'"' -f4)
        if [ "$current_user" != "$github_username" ]; then
            echo "⚠️ Warning: Your authenticated GitHub user ($current_user) is different from the username you entered ($github_username)."
            read -p "Switch to $github_username account? (y/n): " switch_account
            if [ "$switch_account" = "y" ]; then
                gh auth login
            fi
        fi
        gh repo create "$repo_name" --public --description "$repo_description" --source=.
    else
        echo "GitHub CLI not installed. Please create the repository manually on GitHub."
        echo "Then run the following commands:"
        echo "git remote add origin git@github.com:$github_username/$repo_name.git"
        echo "git branch -M main"
        echo "git push -u origin main"
        exit 0
    fi
fi

# Add remote
echo "🔗 Adding remote origin..."
read -p "Use SSH for GitHub (y) or HTTPS (n)? (y/n): " use_ssh
if [ "$use_ssh" = "y" ]; then
    git remote add origin "git@github.com:$github_username/$repo_name.git"
    echo "✅ SSH remote added."
else
    git remote add origin "https://github.com/$github_username/$repo_name.git"
    echo "✅ HTTPS remote added."
fi

# Rename branch to main if it's not already
current_branch=$(git branch --show-current)
if [ "$current_branch" != "main" ]; then
    echo "🔄 Renaming current branch to main..."
    git branch -M main
    echo "✅ Branch renamed to main."
fi

# Push to GitHub
echo "☁️ Pushing to GitHub..."
echo "Checking GitHub authentication..."

# Check which authentication method to use
if git remote -v | grep -q "https://"; then
    echo "Using HTTPS authentication method"
    # For HTTPS repositories, try using credential helper
    git config --global credential.helper cache
    git push -u origin main || {
        echo "⚠️ Authentication error. Please try the following:"
        echo "1. Make sure you have the correct GitHub credentials"
        echo "2. You may need to create a personal access token at https://github.com/settings/tokens"
        echo "3. Try again using: git push -u origin main"
        exit 1
    }
else
    echo "Using SSH authentication method"
    # For SSH repositories, try using SSH key
    git push -u origin main || {
        echo "⚠️ SSH authentication error. Please try the following:"
        echo "1. Make sure your SSH key is properly set up: ssh -T git@github.com"
        echo "2. Check that the SSH key is added to your GitHub account"
        echo "3. Make sure the remote URL is correct: git remote -v"
        echo "4. Try switching to HTTPS: git remote set-url origin https://github.com/$github_username/$repo_name.git"
        exit 1
    }
fi

# If we got here, the push was successful
echo "✅ Successfully pushed to GitHub! 🎉"

echo "---------------------------------------------"
echo "Repository is now available at: https://github.com/$github_username/$repo_name"