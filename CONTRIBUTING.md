# Contributing to EdTech Expo

Thank you for your interest in contributing to the EdTech Expo project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to see if the problem has already been reported. When creating a bug report, please include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment information (OS, Node.js version, Expo version)
- Any relevant error messages

### Suggesting Enhancements

If you have a suggestion for a new feature or improvement:

- Check if the feature has already been requested
- Provide a clear description of the proposed feature
- Explain why this feature would be useful
- Include mockups or examples if applicable

### Code Contributions

#### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork locally
3. Install dependencies: `npm install` or `yarn install`
4. Copy configuration files:
   ```bash
   cp env.example .env
   cp .firebaserc.example .firebaserc
   cp eas.example.json eas.json
   ```
5. Configure the environment files with your settings
6. Create a new branch for your feature: `git checkout -b feature/your-feature-name`

#### Development Guidelines

- **Code Style**: Follow the existing code style and formatting
- **TypeScript**: Use TypeScript for all new code
- **Testing**: Write tests for new features and ensure existing tests pass
- **Documentation**: Update documentation for any new features or changes
- **Commits**: Use clear, descriptive commit messages

#### Pull Request Process

1. Ensure your code follows the project's coding standards
2. Update documentation if necessary
3. Add tests for new functionality
4. Ensure all tests pass
5. Update the README.md if you've changed the setup process
6. Submit a pull request with a clear description of the changes

### Code Review Process

- All pull requests require review before merging
- Reviewers will check for:
  - Code quality and style
  - Test coverage
  - Documentation updates
  - Security considerations
- Address any feedback from reviewers
- Once approved, your PR will be merged

## 📋 Development Standards

### Code Style

- Use 2 spaces for indentation
- Use semicolons at the end of statements
- Use single quotes for strings
- Use camelCase for variables and functions
- Use PascalCase for components and classes
- Use UPPER_SNAKE_CASE for constants

### File Naming

- Use kebab-case for file names
- Use PascalCase for component files
- Use camelCase for utility files

### Component Structure

```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface ComponentProps {
  title: string;
  onPress?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onPress }) => {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
};
```

### API Service Structure

```typescript
import apisauce from 'apisauce';

export class ApiService {
  private api: any;

  constructor() {
    this.api = apisauce.create({
      baseURL: process.env.EXPO_PUBLIC_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async fetchData(): Promise<any> {
    return this.api.get('/endpoint');
  }
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Write unit tests for utility functions
- Write integration tests for API services
- Write component tests for React components
- Aim for at least 80% code coverage

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for functions and classes
- Include parameter types and return types
- Provide examples for complex functions

```typescript
/**
 * Calculates the sum of two numbers
 * @param a - The first number
 * @param b - The second number
 * @returns The sum of a and b
 * @example
 * ```typescript
 * const result = add(2, 3); // returns 5
 * ```
 */
export const add = (a: number, b: number): number => {
  return a + b;
};
```

### README Updates

- Update the README.md when adding new features
- Include setup instructions for new dependencies
- Update the project structure if you add new directories

## 🔒 Security

### Security Guidelines

- Never commit sensitive information (API keys, passwords, etc.)
- Use environment variables for configuration
- Validate all user inputs
- Follow security best practices for authentication
- Report security vulnerabilities privately

### Reporting Security Issues

If you discover a security vulnerability, please report it privately:

1. Do not create a public issue
2. Email the maintainers with details
3. Include steps to reproduce the vulnerability
4. Wait for acknowledgment before disclosing publicly

## 🏷️ Version Control

### Branch Naming

- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/urgent-fix` - Critical fixes
- `docs/documentation-update` - Documentation changes

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build or tool changes

Examples:
```
feat(auth): add login functionality
fix(api): resolve timeout issue in data sync
docs(readme): update installation instructions
```

## 🎯 Getting Help

If you need help with contributing:

1. Check the existing documentation
2. Search existing issues and discussions
3. Create a new issue with the "question" label
4. Join our community discussions

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in the project's README.md and release notes. Significant contributions may be eligible for maintainer status.

Thank you for contributing to EdTech Expo! 🚀
