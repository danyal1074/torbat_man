import { and, eq } from 'drizzle-orm';
import { displayFormValue } from '@torbat/contracts';
import type { Db } from '../db/client';
import { serviceFormSchemas } from '../db/schema';
import type { RequestRecord } from './requests';
export async function formEntries(db:Db,row:RequestRecord,redactSensitive=false){
 if(!row.formData)return [];
 const [schema]=await db.select().from(serviceFormSchemas).where(and(eq(serviceFormSchemas.serviceId,row.serviceId),eq(serviceFormSchemas.version,row.formSchemaVersion??1))).limit(1);
 return Object.entries(row.formData).map(([key,value])=>{
  const field=schema?.jsonSchema.fields.find(f=>f.name===key);
  return {label:field?.label??'اطلاعات تکمیلی',value:redactSensitive&&field?.sensitive?'اطلاعات خصوصی؛ ویژه مسئول پرونده':field?displayFormValue(field,value):value};
 });
}
