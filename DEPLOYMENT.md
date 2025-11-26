# AutoShout Deployment Guide

## Quick Start

This guide provides step-by-step instructions for deploying AutoShout as a Farcaster Mini App on the Base network.

## Prerequisites

- [ ] Node.js 18+ installed
- [ ] Farcaster Developer Portal account
- [ ] Base network wallet with ETH
- [ ] Domain name for hosting

## Deployment Steps

### 1. Prepare Configuration Files

Update the following files with your information:

#### `public/manifest.json`
- Update `blockchain.contract_address` with your deployed contract address
- Update `farcaster.webhook_url` with your webhook endpoint
- Update all URLs in `links` section

#### `public/base-config.json`
- Update `contracts.scheduler.address` with deployed scheduler contract
- Update `contracts.payment.address` with deployed payment contract
- Update `farcaster_integration.webhook_secret` with your secret
- Update `farcaster_integration.mini_app_id` with assigned ID

### 2. Deploy Smart Contracts

See `README_Farcaster.md` for detailed contract deployment instructions.

Quick commands:
