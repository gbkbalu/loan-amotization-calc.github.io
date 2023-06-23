const loanDetailsFormData = {
    loanAmount: 0,
    interestRate: 0,
    loanPeriod: 0,
    emiStartDate: new Date()
}

let loanOutputDetails = {
    emi: 0,
    totalInterest: 0,
    amortization: [],
    totalEarlyPayments: 0,
    totalPrinciple: 0,
    tenureYears: []
}
const extraPaymentScheule = new Map();
const interestRateMap = new Map();
const adjustedEmiMap = new Map();
let formFields = ['loanAmount', 'interestRate', 'loanPeriod', 'emiStartDate']

$(document).ready(() => {
    const reload = () => {
        if (getFormData()) {
            loanOutputDetails = emptyOutPut();
            calculateAmortization();
            table.bootstrapTable('load', loanOutputDetails.amortization);
            loanOutputDetails.tenureYears
                .filter((item, index) => loanOutputDetails.tenureYears.indexOf(item) === index)
                .reduce((prev, current) => {
                    const value = `${prev}-${current}`;
                    mySelect.append(`<option value="${value}"> ${value} </option>`)
                    return current;
                })
        }
    }
    const table = $('#table');
    // Append the option to select
    const mySelect = $('#myselect');
    // month picker
    $(".monthpicker")
        .datepicker({
            format: "MM-yyyy",
            minViewMode: "months",
            autoclose: true,
        })
        .on("change", function (e) {
            console.log('date picker reloading..........')
            reload();
        });

    mySelect.change(() => reload());
    formFields = formFields.map(fieldId => {
        const field = $(`#${fieldId}`);
        if (fieldId != 'emiStartDate') {
            field.on("change", (e) => {
                console.log(`${fieldId} reloading..........`)
                reload()
            });
        }
        return { id: fieldId, field }
    })
    reload();
    table.bootstrapTable({
        columns: columns,
        data: loanOutputDetails.amortization,
    });

    $("input[type='checkbox']").change((e) => {
        let index = e.target.dataset.index;
        let rowData = loanOutputDetails.amortization[index];
        e.target.checked = false;
        console.log(rowData);
        $('#exampleModal').modal({ show: true })

    })
});



const getValue = (i, interestRate, emi) => {
    const extraPaymentForThisInstallment =
        extraPaymentScheule.get(i) != null ? extraPaymentScheule.get(i) : 0;
    const interestRateforThisMonth =
        interestRateMap.get(i) != null ? interestRateMap.get(i) : interestRate;
    const emiThisMonth =
        adjustedEmiMap.get(i) != null ? adjustedEmiMap.get(i) : emi;
    return {
        extraPaymentForThisInstallment,
        interestRateforThisMonth,
        emiThisMonth
    }

}

const getFormData = () => {
    let flag = true;
    // get form field values
    formFields.map(item => {
        const { id, field } = item;
        let value = isNotNull(field.val()) ? field.val() : '0';
        if (id != 'emiStartDate') {
            if (value == 0) flag = false;
            value = eval(value.replace(/,/g, ""))
        };
        loanDetailsFormData[id] = value;
    });
    return flag;
}

const calculateAmortization = () => {
    let { loanAmount, interestRate, loanPeriod, emiStartDate } = loanDetailsFormData;
    let { emi, totalInterest, amortization, totalEarlyPayments, totalPrinciple, tenureYears } = loanOutputDetails;
    const selectedYear = $('#myselect').val();
    let emiDate = emiStartDate != 0 ? new Date(emiStartDate) : new Date();

    emi = calculateEmi(interestRate, loanPeriod, loanAmount)

    let endingBalance = loanAmount;
    for (let i = 0; endingBalance > emi; i++) {

        emiDate = new Date(emiDate.setMonth(emiDate.getMonth() + 1));
        tenureYears.push(emiDate.getFullYear());
        let { extraPaymentForThisInstallment, interestRateforThisMonth, emiThisMonth } = getValue(i, interestRate, emi);

        //assing new values of emi, interestRate
        emi = emiThisMonth;
        interestRate = interestRateforThisMonth;
        const beginingBalance = endingBalance;

        // calculate roi
        const roi = interestRate / 12 / 100;
        // calculate interest_amount
        const interestAmount = beginingBalance * roi;
        // calculate principle_amount
        const principleAmount = emi - interestAmount;
        // check interest is morethan emi and adjust
        if (principleAmount < 0) {
            // adjust emi
            emi = calculateEmi(interestRate, loanPeriod, loanAmount);
            principleAmount = emi - interestAmount;
        }
        endingBalance = beginingBalance - (principleAmount + extraPaymentForThisInstallment);

        // check pay for last installment
        if (endingBalance < 0) {
            extraPaymentForThisInstallment = (beginingBalance - principleAmount);
            endingBalance = 0;
        }
        totalEarlyPayments += extraPaymentForThisInstallment;
        totalPayMent = extraPaymentForThisInstallment + emi;
        if (selectedYear == 'select year' || validateDate(emiDate, selectedYear)) {
            totalInterest += interestAmount;
            totalPrinciple += principleAmount;

            amortization.push({
                id: i + 1,
                month: i + 1,
                emiDate: emiDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                }),
                beginingBalance: AMOUNT_FORMAT.format(Math.round(beginingBalance)),
                endingBalance: AMOUNT_FORMAT.format(Math.round(endingBalance)),
                totalPayMent: AMOUNT_FORMAT.format(Math.round(totalPayMent)),
                principleAmount: AMOUNT_FORMAT.format(Math.round(principleAmount)),
                interestAmount: AMOUNT_FORMAT.format(Math.round(interestAmount)),
                interestRate: INTERESTRATE_FORMAT.format(interestRate),
                emi: AMOUNT_FORMAT.format(Math.round(emi))
            });
        }

    }
    loanOutputDetails = {
        ...loanOutputDetails,
        emi,
        totalInterest: AMOUNT_FORMAT.format(Math.round(totalInterest)),
        totalEarlyPayments: AMOUNT_FORMAT.format(Math.round(totalEarlyPayments)),
        totalPrinciple: AMOUNT_FORMAT.format(Math.round(totalPrinciple) + Math.round(endingBalance))
    }
    renderChart(Math.round(totalPrinciple + endingBalance), totalInterest);

    console.log(loanOutputDetails)

}

const operateEvents = (eve) => {
    console.log(eve)
}
