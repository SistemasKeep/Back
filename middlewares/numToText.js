class NumToText{
    number = 0
    cents = 0
    ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    teens = ['eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    tens = ['', 'ten', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    thousands = ['', 'thousand', 'million'];
    constructor(number){
        this.number = parseInt(number)
        this.cents = parseFloat(number) - this.number
    }
    
    numberToWords(){
        if (this.number === 0) {
            return 'zero';
        }
        var text = this.numberToWordsRecursive(this.number, 0)
        text = text.toUpperCase()
        const cents = this.cents * 100
        return `${text}, AND ${Number(cents.toFixed(6))}/100`
    }


    convertLessThanOneThousand(number) {
        let word = '';
        const hundreds = Math.floor(number / 100);
        const remainder = number % 100;
        
        if (hundreds > 0) {
            word += this.ones[hundreds] + ' hundred';
            if (remainder > 0) {
                word += ' ';
            }
        }

        if (remainder > 10 && remainder < 20) {
            word += this.teens[remainder - 11];
        } else {
            const tensDigit = Math.floor(remainder / 10);
            const onesDigit = remainder % 10;
            word += this.tens[tensDigit];
            if (onesDigit > 0) {
                word += ' ' + this.ones[onesDigit];
            }
        }

        return word.trim();
    }

    numberToWordsRecursive(number, idx) {
        if (number === 0) {
            return '';
        }

        const hundreds = number % 1000;
        const rest = Math.floor(number / 1000);

        let result = '';
        if (hundreds > 0) {
            result = this.convertLessThanOneThousand(hundreds);
            if (idx > 0) {
                result += ' ' + this.thousands[idx];
            }
        }

        return (this.numberToWordsRecursive(rest, idx + 1) + ' ' + result).trim();
    }
}

module.exports = {
	NumToText
}