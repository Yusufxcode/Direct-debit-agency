import { Component } from '@angular/core';

import { DirectDebitFormComponent } from './direct-debit-form/direct-debit-form.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DirectDebitFormComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Direct Debit Agency';
}
