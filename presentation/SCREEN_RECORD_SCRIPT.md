# Screen Record Script - MOC Hackathon Demo (5 minutes)

**What you need:**
- Dashboard running (it is)
- MetaMask connected to Sepolia
- Terminal open (click "Open Terminal" at bottom)
- This script in front of you

---

## [0:00-0:15] START - Introduce Yourself

**DO:** Show yourself on camera for 10 seconds, then show the dashboard

**SAY:**
> "Hi, I'm [YOUR NAME]. This is MOC - Mirror of Chainlink, my submission for the Reactive Network Bounty. I'm going to show you how it works, and then I'm going to prove it's secure by running a full attack simulation."

---

## [0:15-0:30] SHOW DEPLOYMENT INFO

**DO:** 
- Scroll down a bit so we can see the Sepolia contracts
- Point at the contract addresses and transaction hashes

**SAY:**
> "You're looking at the Deployment Info tab. Every contract is deployed and verified on live testnets. Here's the MockPriceFeed on Sepolia, the OriginFeedRelay contract, and below that we have the Reactive Network contracts and Lasna destination chain. All of these have transaction hashes - this is fully auditable, end-to-end on-chain."

---

## [0:30-0:50] CLICK TO INTERACTIVE TESTS TAB

**DO:** 
- Click the "Interactive Tests" tab
- Show the "Read Latest Price" button

**SAY:**
> "Now let's go to the interactive tests. First, I'll read the current price on Sepolia."

---

## [0:50-1:10] READ THE STARTING PRICE

**DO:**
- Click "Read Latest Price" button
- Wait for the result to show
- Point at the price on screen

**SAY:**
> "You can see the current price is $1500, round ID 8. Now I'm going to update this price to trigger a relay across chains."

---

## [1:10-1:30] UPDATE THE PRICE

**DO:**
- Scroll down to find "Update Price" button
- Click it
- Confirm in MetaMask when it pops up
- Wait for confirmation

**SAY:**
> "I'm clicking Update Price. MetaMask pops up - I'll confirm the transaction. This creates a new round with a new price on the origin chain."

*Wait for tx to confirm, then point at screen:*

> "Done. The new price is $2500, round ID 9."

---

## [1:30-1:50] RELAY PRICE CROSS-CHAIN

**DO:**
- Scroll to find "Relay Price" button
- Click it
- Confirm in MetaMask
- Wait for confirmation

**SAY:**
> "Now I'm relaying this price to the destination chain. When I click Relay Price, it emits an event. The Reactive Network picks up that event and automatically forwards it to Lasna. The relay is happening right now."

---

## [1:50-2:00] SCROLL DOWN TO SEE ATTACK LOG

**DO:**
- Scroll down to see the "Security Event Log" table

**SAY:**
> "You'll notice there's a Security Event Log below. This is going to get interesting."

---

## [2:00-2:50] RUN ATTACK SIMULATION (THE KEY MOMENT)

**DO:**
- Scroll to the bottom
- Click "Open Terminal" button (bottom right)
- In the terminal, type: `npx hardhat run scripts/test/simulate_attack.js --network hardhat`
- Press Enter
- Wait for the FULL output to complete (it takes ~10-15 seconds)

**SAY (while it runs):**
> "Now watch what happens when I run our Villain Mode attack simulation. This script tries to inject four different types of malicious data into the destination contract. Pay attention to what gets rejected."

*Let the output run. Read it aloud as it appears:*

> "Attack 1: Zero price injection - REJECTED. Attack 2: Negative price - REJECTED. Attack 3: Flash crash, a 99% price drop - REJECTED. Attack 4: Replay attack with old data - REJECTED."

*After it finishes:*

> "Four attacks. Four rejections. Four times the smart contract said NO. This is real contract behavior, not a simulation. The firewall worked."

---

## [2:50-3:10] SHOW THE SECURITY EVENT LOG UPDATED

**DO:**
- Close the terminal (click "Close Terminal" button)
- Scroll up to look at the Security Event Log table
- Point at the red "BLOCKED" rows

**SAY:**
> "Look at the Security Event Log. Each attack attempt is logged in red - BLOCKED. The contract caught every single one. This is what a working circuit breaker looks like."

---

## [3:10-3:30] READ DESTINATION PRICE (STILL VALID)

**DO:**
- Click "Read Destination Price" button
- Show the result on screen

**SAY:**
> "And here's the price on the destination chain. It's still $2500. The legitimate price update went through, but all the attacks were stopped. The system did exactly what it should do."

---

## [3:30-4:00] EXPLAIN WHY THIS MATTERS

**DO:** 
- Point back at the Deployment Info tab
- Show the contract addresses

**SAY:**
> "Here's what's important: This isn't theoretical. Every contract is deployed on real testnets. The origin chain is Sepolia. The reactive middleware is the Reactive Network. The destination is Lasna. All of this is live. All of this is auditable."

> "Other oracle bridges blindly relay data. MOC validates, filters, and defends. The Reactive Network makes this possible - it's the only platform that lets you build stateful, event-driven middleware like this."

> "I've proven two things today: One, the system works for legitimate prices. Two, the system blocks attacks. That's production-grade oracle infrastructure."

---

## [4:00-5:00] CLOSING

**DO:**
- Optional: Show GitHub link or any documentation
- Or just speak to camera

**SAY:**
> "MOC is built with Reactive Contracts, tested with real attack simulations, and deployed on Sepolia and Lasna testnets. Every transaction is verifiable. The code is on GitHub. This is my submission for the Reactive Network Bounty. Thank you for watching."

---

## QUICK REFERENCE

| Time | DO THIS | SAY THIS |
|------|---------|----------|
| 0:00 | Show yourself | Introduce yourself & project |
| 0:15 | Scroll Deployment Info | Show deployed contracts & TX hashes |
| 0:30 | Click "Interactive Tests" | Transition to live testing |
| 0:50 | Click "Read Latest Price" | Show $1500 starting price |
| 1:10 | Click "Update Price" → MetaMask confirm | Update to $2500 |
| 1:30 | Click "Relay Price" → MetaMask confirm | Relay to destination chain |
| 1:50 | Scroll to see Security Event Log | Show where attacks will be logged |
| 2:00 | Click "Open Terminal" | Prepare for attack demo |
| 2:00 | Type & run attack script | Run: `npx hardhat run scripts/test/simulate_attack.js --network hardhat` |
| 2:50 | Close terminal, look at log | Show red BLOCKED rows |
| 3:10 | Click "Read Destination Price" | Verify price is still $2500 |
| 3:30 | Point at contracts | Explain operational maturity |
| 4:00 | Close out | Final closing statement |

---

## CRITICAL: Before you record

1. **Refresh the page** - Make sure you're on latest version
2. **Connect MetaMask to Sepolia** - Required for Update Price and Relay Price buttons to work
3. **Have some ETH in your Sepolia wallet** - For the transactions
4. **Open the terminal once** to test that it works before recording
5. **Practice the timing** - Run through once without recording first

## Pro Tips

- **Speak slowly** - Technical content needs time to sink in
- **Point at things** - Move your cursor to show what you're talking about
- **Pause for output** - Give attack simulation time to complete before talking
- **Show the TX hashes** - Zoom in on the addresses so judges can verify
- **Don't rush the attack demo** - It's the most important part. Let each rejection be clear

That's it. Screen record this and you've got a 5-minute demo ready to go.
