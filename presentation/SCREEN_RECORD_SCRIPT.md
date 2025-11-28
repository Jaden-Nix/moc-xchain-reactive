# Screen Record Script - MOC Hackathon Demo (5 minutes)
## WITH LIVE ATTACK SIMULATION BUTTON

**What you need:**
- Dashboard running (it is)
- MetaMask connected to Sepolia
- This script in front of you

---

## [0:00-0:15] START - Introduce Yourself

**DO:** Show yourself on camera for 10 seconds, then show the dashboard

**SAY:**
> "Hi, I'm [YOUR NAME]. This is MOC - Mirror of Chainlink, my submission for the Reactive Network Bounty. I'm going to show you how it works, and then I'm going to prove it's secure by simulating real attacks against the smart contract."

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

## [1:50-3:50] RUN ATTACK SIMULATION (THE KEY MOMENT) ⭐⭐⭐

**DO:**
- Scroll down to the Security Event Log section
- Click the red **"🦹 Run Attack Simulation"** button
- Watch the table populate (takes ~10-15 seconds)

**SAY (before clicking):**
> "Now watch what happens when I run our attack simulation. This button runs 4 different attacks against the destination smart contract. Four attackers are about to try to inject malicious data. Let's see if the contract stops them."

*Click the button and wait. Narrate as events appear:*

> "Attack 1: Zero price injection - BLOCKED with InvalidAnswer(). Attack 2: Negative price - BLOCKED with InvalidAnswer(). Attack 3: Flash crash, a 99% price drop - BLOCKED with DeviationTooHigh(). Attack 4: Replay attack with old data - BLOCKED with InvalidRoundId()."

*Point at the summary stats:*

> "Four attacks. Four rejections. All in the Security Event Log. Look at those stats: 4 Attacks Blocked, 100% Threat Detection. This is real contract behavior, not simulated. The firewall worked perfectly."

---

## [3:50-4:10] READ DESTINATION PRICE (STILL VALID)

**DO:**
- Scroll back to "Interactive Tests" tab
- Click "Read Destination Price" button
- Show the result on screen

**SAY:**
> "And here's the price on the destination chain. It's still $2500, round ID 9. The legitimate price update went through, but all the attacks were stopped. The system did exactly what it should do."

---

## [4:10-4:50] EXPLAIN WHY THIS MATTERS

**DO:** 
- Scroll back up to Deployment Info tab
- Show the contract addresses

**SAY:**
> "Here's what's important: This isn't theoretical. Every contract is deployed on real testnets. The origin chain is Sepolia. The reactive middleware is the Reactive Network. The destination is Lasna. All of this is live. All of this is auditable."

> "Other oracle bridges blindly relay data. MOC validates, filters, and defends. The Reactive Network makes this possible - it's the only platform that lets you build stateful, event-driven middleware like this."

> "I've proven two things today: One, the system works for legitimate prices. Two, the system blocks attacks. That's production-grade oracle infrastructure."

---

## [4:50-5:00] CLOSING

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
| 1:50 | Scroll to Security Event Log | Find the red button |
| 1:50 | Click **"🦹 Run Attack Simulation"** | Start attack demo |
| 2:50 | Watch events appear | Narrate: Attack 1 BLOCKED, Attack 2 BLOCKED, etc. |
| 3:50 | Scroll back to Interactive Tests | Read Destination Price |
| 4:10 | Click "Read Destination Price" | Verify price is still $2500 |
| 4:30 | Back to Deployment Info | Explain operational maturity |
| 4:50 | Close out | Final closing statement |

---

## CRITICAL: Before you record

1. **Refresh the page** - Make sure you're on latest version
2. **Connect MetaMask to Sepolia** - Required for Update Price and Relay Price buttons to work
3. **Have some ETH in your Sepolia wallet** - For the transactions
4. **Test the button once** - Click "Run Attack Simulation" once before recording to verify it works
5. **Practice the timing** - Run through once without recording first

## Pro Tips

- **Speak slowly** - Technical content needs time to sink in
- **Point at things** - Move your cursor to show what you're talking about
- **Pause for output** - Give attack simulation 10-15 seconds to complete
- **Show the TX hashes** - Zoom in on the addresses so judges can verify
- **Don't rush the attack demo** - It's the most impressive part. Let each rejection be clear
- **The 100% stat is your proof** - Point at "Threat Detection: 100%" to prove all attacks were caught

That's it. You now have a 5-minute demo script that shows:
1. Legitimate price relay working ✓
2. Attack simulation running ✓
3. All attacks blocked ✓
4. Threat detection at 100% ✓

Screen record and you're done! 🎥
