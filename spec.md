# AutoShout - Farcaster Mini App

## Overview
AutoShout is a Farcaster Mini App that allows users to automatically schedule and share their Farcaster posts (casts) at their desired date and time. The application runs natively on the Base network as a Farcaster Mini App with onchain integration.

## Core Features

### Post Scheduling
- Users can specify text content, media files, and publication date/time
- Scheduled posts are listed in calendar view
- Users can edit or delete scheduled posts

### Automatic Publishing
- Posts are automatically shared on Farcaster at the specified time
- Users receive successful publication notifications
- Publication history is stored and viewable

### Fee System
- Free users: Can schedule 10 posts per week
- Premium users: Can schedule 100 posts per week
- Micro payment deduction from each scheduling operation via Base network

## Data Storage (Backend)

### User Data
- Farcaster account information
- Premium subscription status
- Usage statistics

### Scheduled Posts
- Post content (text and media references)
- Publication date and time
- Post status (pending, published, failed)
- User ID association

### Transaction History
- Completed publication records
- Payment transactions on Base network
- Error logs

## Backend Operations

### Post Management
- Create new post scheduling records
- List scheduled posts
- Edit and delete posts
- Display user's own posts

### Automatic Publishing Service
- Detect posts due for publication
- Submit posts to Farcaster API
- Update publication status
- Send notifications to users

### Payment Operations
- Premium subscription management via Base network smart contracts
- Record micro payment deductions
- Check usage limits

## User Interface

### Home Page
- Summary view of scheduled posts
- Quick post scheduling button
- Premium features introduction

### Post Scheduling Screen
- Text input field
- Media upload option
- Date and time picker
- Save and cancel buttons

### Calendar View
- Calendar format display of scheduled posts
- View post details
- Edit and delete options

### History Page
- List of published posts
- Success/failure status
- Publication dates

## Technical Integrations

### Farcaster Mini App Integration
- Farcaster Mini App manifest configuration
- User account verification through Farcaster
- Post publishing API integration
- Profile information retrieval

### Base Network Integration
- Smart contract for scheduling records
- Payment transactions on Base
- Transaction history storage
- RPC endpoint configuration

## Configuration Files

### Farcaster Mini App Manifest
- App metadata including name "AutoShout"
- Description "Automated Farcaster post scheduling app"
- Categories and author information
- Logo reference to autoshout-logo-transparent
- Base network integration parameters

### Base Network Configuration
- RPC endpoint configuration
- Contract address placeholders
- Supported chains array
- Farcaster Warpcast Mini App integration parameters

## Documentation
- Comprehensive deployment guide for Farcaster Developer Portal
- Base onchain configuration instructions
- Contract deployment steps
- Integration setup documentation

## Assets Integration
- Application logo: autoshout-logo-transparent
- Calendar illustration: calendar-illustration
- Dashboard mockup: dashboard-mockup

## Language and Localization
- Application content is presented in English
- Date and time formats follow standard conventions
