import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CurrencyMaskModule } from 'ng2-currency-mask';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { NIBSS__BANKS } from '../models/banks.model';
import { ApiService } from '../services/api.service';

type MandateModalResponse = {
  title: string;
  message: string;
  requestCode?: string;
  setUpUrl?: string;
  responseCode?: string;
  succeed: boolean;
};

type ActivationPaymentAccount = {
  option: string;
  accountNumber: string;
  bankName: string;
};

@Component({
  selector: 'app-direct-debit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyMaskModule],
  templateUrl: './direct-debit-form.component.html',
  styleUrl: './direct-debit-form.component.css'
})
export class DirectDebitFormComponent {
  submittedPayload = '';
  mandateResponse: MandateModalResponse | null = null;
  isMandateModalOpen = false;
  readonly BANKS = NIBSS__BANKS;
  readonly paymentFrequencies = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];
  readonly activationPaymentAmount = 50;
  readonly activationPaymentAccounts: ActivationPaymentAccount[] = [
    {
      option: 'Option 1',
      accountNumber: '9880218357',
      bankName: 'Titan-Paystack'
    },
    {
      option: 'Option 2',
      accountNumber: '9020025928',
      bankName: 'FIDELITY BANK'
    }
  ];
  readonly amountLimitCurrencyOptions = {
    align: 'left',
    prefix: '',
    thousands: ',',
    decimal: '.',
    precision: 0,
    allowNegative: false
  };
  selectedBank: any;
  selectedProduct: any;
  products: any[] = [];
  isCheckingAccountNumber = false;
  isCreatingMandate = false;

  readonly form = this.formBuilder.nonNullable.group({
    recipient: ['', [Validators.required, Validators.email]],
    productId: ['', Validators.required],
    expiryDate: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    amountLimit: [0, [Validators.required, Validators.min(0)]],
    billingCycle: ['', Validators.required],
    description: ['', Validators.required],
    serviceReference: ['', Validators.required],
    bankCode: ['', Validators.required],
    mandateAccountName: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    mandateAccountNumber: ['', Validators.required],
    payerAddress: ['', Validators.required],
    payerName: ['', Validators.required],
  });

  constructor(private readonly formBuilder: FormBuilder, private readonly apiService: ApiService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.getProducts();
  }

  get isPageLoading(): boolean {
    return this.isCheckingAccountNumber || this.isCreatingMandate;
  }

  get loadingMessage(): string {
    if (this.isCreatingMandate) {
      return 'Creating mandate request...';
    }

    if (this.isCheckingAccountNumber) {
      return 'Checking account number...';
    }

    return 'Loading...';
  }

  getProducts(): void {
    this.apiService.productList().subscribe((response: any) => {
      console.log(response);
      const products = Array.isArray(response) ? response : response?.data ?? [];
      this.products = Array.isArray(products) ? products : [];
    });
  }

  getProductValue(product: any): string {
    return String(product.id || product.productId || product.productCode || product.name || '');
  }

  onProductChange(event: Event): void {
    const selectedProductValue = (event.target as HTMLSelectElement).value;
    this.selectedProduct = this.products.find((product) => this.getProductValue(product) === selectedProductValue);
    console.log(this.selectedProduct);
  }

  onBankCodeChange(event: Event): void {
    this.selectedBank = this.BANKS.find((bank) => bank.bankCode === (event.target as HTMLSelectElement).value);
    console.log(this.selectedBank);
  }

  get canUseAccountNameForPayer(): boolean {
    const accountName = this.form.controls.mandateAccountName.value.trim();
    const payerName = this.form.controls.payerName.value.trim();

    return accountName.length > 0 && payerName !== accountName && !this.form.controls.payerName.dirty;
  }

  useAccountNameForPayer(): void {
    const accountName = this.form.controls.mandateAccountName.value.trim();

    this.form.patchValue({
      payerName: accountName
    });
  }

  checkAccountNumber(event: Event): void {
    const accountNumber = (event.target as HTMLInputElement).value;

    if (accountNumber.length !== 10 || !this.selectedBank) {
      this.isCheckingAccountNumber = false;
      this.form.patchValue({ mandateAccountName: '' });
      return;
    }

    this.isCheckingAccountNumber = true;

    this.apiService.verifyAccount({
      accountNo: accountNumber,
      nipcode: this.selectedBank.nipcode,
      channel: 'simple'
    })
      .pipe(finalize(() => {
        this.isCheckingAccountNumber = false;
      }))
      .subscribe((response: any) => {
        console.log(response);
        this.form.patchValue({ mandateAccountName: response.data.accountName });
      });
  }

  createMandate(): void {
    if (this.isCreatingMandate) {
      return;
    }

    this.isCreatingMandate = true;
    const payload = this.form.getRawValue();
    const parsedProductId = Number(payload.productId);
    const additionalPayload = {
      productId: Number.isFinite(parsedProductId) ? parsedProductId : null,
      expiryDate: (() => {
        const startDateStr = this.form.controls.startDate.value;
        if (!startDateStr) return null;
        const startDate = new Date(startDateStr);
        const expiryDate = new Date(startDate.getTime() + 5 * 24 * 60 * 60 * 1000);
        return expiryDate.toISOString().split('T')[0];
      })(),
      preferredCompletionOptions: 'Instant',
      createdBy: 'ZPL-admin'
    };
    const finalPayload = { ...payload, ...additionalPayload  };
    console.log(finalPayload);

    this.apiService.createMandate(finalPayload)
      .pipe(finalize(() => {
        this.isCreatingMandate = false;
      }))
      .subscribe({next: (response: any) => {
        console.log(response);
        if(response.externalResponse){
          this.toastr.success("Mandate request created successfully");
          this.openMandateResponseModal(response);
        } else {
          this.toastr.error("Error creating mandate", "An error occurred while creating the mandate request, please try again.");
        }
      }, error: (error: any) => {
        this.toastr.error("Error creating mandate", "An error occurred while creating the mandate request, please try again.");
      }});
  }

  closeMandateModal(): void {
    this.isMandateModalOpen = false;
  }

  copyMandateLink(): void {
    const setUpUrl = this.mandateResponse?.setUpUrl;

    if (!setUpUrl) return;

    navigator.clipboard?.writeText(setUpUrl);
  }

  copyActivationValue(value: string, label: string): void {
    navigator.clipboard?.writeText(value);
    this.toastr.success(`${label} copied`);
  }

  private openMandateResponseModal(response: any): void {
    const externalResponse = this.parseExternalResponse(response?.externalResponse);
    const message = this.formatResponseMessage(externalResponse?.message || response?.message || 'Mandate response received.');

    this.mandateResponse = {
      title: externalResponse?.succeed ? 'Mandate link created' : 'Mandate response',
      message,
      requestCode: externalResponse?.data?.requestCode,
      setUpUrl: externalResponse?.data?.setUpUrl,
      responseCode: externalResponse?.responseCode,
      succeed: Boolean(externalResponse?.succeed)
    };
    this.isMandateModalOpen = true;
  }

  private parseExternalResponse(externalResponse: unknown): any {
    if (typeof externalResponse !== 'string') {
      return externalResponse;
    }

    try {
      return JSON.parse(externalResponse);
    } catch {
      return null;
    }
  }

  private formatResponseMessage(message: string): string {
    return message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\s+https?:\/\/\S+/g, '')
      .trim();
  }
}
