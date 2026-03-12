export interface Quote {
 id: number;
 en: string;
 hi: string;
 te: string;
 ta: string;
 kn: string;
 ml: string;
}

const baseQuotes = [
 "Save first, spend later.",
 "A penny saved is a penny earned.",
 "Time in the market beats timing the market.",
 "Do not put all your eggs in one basket.",
 "Compound interest is the 8th wonder of the world.",
 "Risk comes from not knowing what you're doing.",
 "Pay yourself first.",
 "Live below your means.",
 "An investment in knowledge pays the best interest.",
 "Never depend on single income.",
 "Price is what you pay. Value is what you get.",
 "Opportunities come infrequently. When it rains gold, put out the bucket.",
 "The more you learn, the more you earn.",
 "Every day is a bank account, and time is our currency.",
 "Wealth consists not in having great possessions, but in having few wants.",
 "Don't tell me what you value, show me your budget.",
 "Beware of little expenses. A small leak will sink a great ship.",
 "Money grows on the tree of persistence.",
 "The stock market is a device for transferring money from the impatient to the patient.",
 "It's not your salary that makes you rich, it's your spending habits.",
 "Financial peace isn't the acquisition of stuff. It's learning to live on less than you make.",
 "Empty pockets never held anyone back. Only empty heads and empty hearts can do that.",
 "Wealth is largely the result of habit.",
 "Do not save what is left after spending, but spend what is left after saving.",
 "He who buys what he does not need, steals from himself.",
 "Balancing your money is the key to having enough.",
 "Let your money work for you, not you work for your money.",
 "A budget is telling your money where to go instead of wondering where it went.",
 "Rich people have small TVs and big libraries.",
 "Frugality includes all the other virtues.",
 "Never spend your money before you have earned it.",
 "Invest in yourself. Your career is the engine of your wealth.",
 "Patience is the best currency for an investor.",
 "Money is a terrible master but an excellent servant.",
 "If you would be wealthy, think of saving as well as getting.",
 "There are no secrets to success. It is the result of preparation, hard work, and learning from failure.",
 "Wealth is not about having a lot of money; it's about having a lot of options.",
 "The goal isn't more money. The goal is living your life on your own terms.",
 "Formal education will make you a living; self-education will make you a fortune.",
 "Don't work for money; make it work for you.",
 "To acquire wealth is a difficult task, but to keep it is even more difficult.",
 "You must gain control over your money or the lack of it will forever control you.",
 "Financial freedom is mental, emotional and educational process.",
 "Money without financial intelligence is money soon gone.",
 "Small amounts saved daily add up to huge investments.",
 "Discipline weighs ounces, regret weighs tons.",
 "Keep your eyes on the prize, and your money in the bank.",
 "Every time you borrow money, you're robbing your future self.",
 "The art is not in making money, but in keeping it.",
 "Earn with your mind, not your time.",
 "Build assets, avoid liabilities.",
 "Rich is measured in money, wealth is measured in time.",
 "Financial literacy is the most important skill you can learn.",
 "Start early, invest regularly, and stay invested.",
 "The habit of saving is itself an education.",
 "A successful investment involves doing nothing most of the time.",
 "Your net worth to the world is usually determined by what remains after your bad habits are subtracted.",
 "If you want to reap financial blessings, you have to sow financially.",
 "Money is multiplied in practical value depending on the number of W's you control in your life.",
 "Good things happen to those who save."
];

export const dailyQuotes: Quote[] = baseQuotes.map((text, i) => ({
 id: i + 1,
 en: text,
 // Provide general suffixes or simulated translations for now.
 // In a production scenario, these would be precise localized strings.
 hi: text + ' (हिंदी)',
 te: text + ' (తెలుగు)',
 ta: text + ' (தமிழ்)',
 kn: text + ' (ಕನ್ನಡ)',
 ml: text + ' (മലയാളം)',
}));
