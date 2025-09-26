#!/bin/bash
# Version bumping script for FilterFox

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [major|minor|patch|beta|alpha]"
    echo "Examples:"
    echo "  $0 patch    # 1.0.0 -> 1.0.1"
    echo "  $0 minor    # 1.0.0 -> 1.1.0"  
    echo "  $0 major    # 1.0.0 -> 2.0.0"
    echo "  $0 beta     # 1.0.0 -> 1.1.0-beta"
    echo "  $0 alpha    # 1.0.0 -> 1.1.0-alpha"
    exit 1
}

# Check if version type is provided
if [ $# -eq 0 ]; then
    usage
fi

VERSION_TYPE=$1

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: $CURRENT_VERSION${NC}"

# Calculate new version using npm version (dry run)
case $VERSION_TYPE in
    major|minor|patch)
        NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version --dry-run | sed 's/v//')
        ;;
    beta)
        NEW_VERSION=$(npm version preminor --preid=beta --no-git-tag-version --dry-run | sed 's/v//')
        ;;
    alpha)
        NEW_VERSION=$(npm version preminor --preid=alpha --no-git-tag-version --dry-run | sed 's/v//')
        ;;
    *)
        echo -e "${RED}Invalid version type: $VERSION_TYPE${NC}"
        usage
        ;;
esac

echo -e "${GREEN}New version will be: $NEW_VERSION${NC}"
echo ""

# Confirm with user
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Version bump cancelled${NC}"
    exit 0
fi

echo -e "${YELLOW}Bumping version to $NEW_VERSION...${NC}"

# Update package.json
case $VERSION_TYPE in
    major|minor|patch)
        npm version $VERSION_TYPE --no-git-tag-version
        ;;
    beta)
        npm version preminor --preid=beta --no-git-tag-version
        ;;
    alpha)
        npm version preminor --preid=alpha --no-git-tag-version
        ;;
esac

# Update manifest.json
echo -e "${YELLOW}Updating manifest.json...${NC}"
sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" manifest.json

# Update any other files that contain version
if [ -f "src/background.js" ]; then
    sed -i "s/version.*$CURRENT_VERSION/version $NEW_VERSION/g" src/background.js
fi

echo -e "${GREEN}Version updated successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Review the changes:"
echo "   git diff"
echo ""
echo "2. Commit the version bump:"
echo "   git add ."
echo "   git commit -m \"Bump version to $NEW_VERSION\""
echo ""
echo "3. Create and push the tag:"
echo "   git tag -a v$NEW_VERSION -m \"FilterFox v$NEW_VERSION\""
echo "   git push origin main"
echo "   git push origin v$NEW_VERSION"
echo ""
echo -e "${GREEN}This will trigger an automated release on GitHub!${NC}"